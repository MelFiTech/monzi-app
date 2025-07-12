import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';
import { useSetWalletPin } from '@/hooks/useWalletService';
import ToastService from '@/services/ToastService';

interface SetPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SetPinModal({
  visible,
  onClose,
  onSuccess,
}: SetPinModalProps) {
  const { colors } = useTheme();
  const [slideAnim] = useState(new Animated.Value(0));
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'set' | 'confirm'>('set');
  const [isLoading, setIsLoading] = useState(false);

  const maxPinLength = 4;
  const panY = useRef(new Animated.Value(0)).current;
  const setWalletPinMutation = useSetWalletPin();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Only allow downward drag
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) { // Threshold to close modal
          handleClosePress();
        } else {
          // Reset position if not dragged enough
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Slide animation effect
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(300);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  }, [visible, slideAnim]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setPin('');
      setConfirmPin('');
      setStep('set');
      setIsLoading(false);
      panY.setValue(0);
    }
  }, [visible]);

  const handlePinChange = (text: string) => {
    // Only allow numeric input and limit to maxPinLength
    const numericValue = text.replace(/[^\d]/g, '').slice(0, maxPinLength);
    
    if (step === 'set') {
      setPin(numericValue);
      
      // Auto-proceed when PIN is complete
      if (numericValue.length === maxPinLength) {
        setTimeout(() => {
          setStep('confirm');
        }, 200);
      }
    } else {
      setConfirmPin(numericValue);
      
      // Auto-submit when confirmation PIN is complete
      if (numericValue.length === maxPinLength) {
        setTimeout(() => {
          handleConfirm(numericValue);
        }, 200);
      }
    }
  };

  const handleConfirm = async (confirmPinValue: string) => {
    if (pin !== confirmPinValue) {
      ToastService.error('The PINs you entered do not match. Please try again.');
      setConfirmPin('');
      setStep('set');
      setPin('');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔑 Setting wallet PIN...');
      
      await setWalletPinMutation.mutateAsync({ pin });
      
      console.log('✅ PIN set successfully');
      
      ToastService.success('Pin Set Successfully');
      
      // Close modal after short delay to show toast
      setTimeout(() => {
        onSuccess();
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Set PIN failed:', error);
      
      let errorMessage = 'Failed to set PIN. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      ToastService.error(errorMessage);
      setConfirmPin('');
      setStep('set');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalPress = (event: any) => {
    event.stopPropagation();
  };

  const handleClosePress = () => {
    onClose();
  };

  const getCurrentPin = () => step === 'set' ? pin : confirmPin;

  const renderPinDots = () => {
    const currentPin = getCurrentPin();
    
    return (
      <View style={styles.pinDotsContainer}>
        {Array.from({ length: maxPinLength }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              {
                backgroundColor: index < currentPin.length ? '#F5C842' : 'rgba(255, 255, 255, 0.3)',
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClosePress}
    >
      <View style={styles.overlay}>
        <BlurView intensity={8} style={styles.blurView}>
          <KeyboardAvoidingView 
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContainer}>
              <Animated.View
                style={{
                  transform: [
                    { translateY: slideAnim },
                    { translateY: panY }
                  ],
                }}
                {...panResponder.panHandlers}
              >
                <TouchableOpacity
                  style={styles.modalContent}
                  activeOpacity={1}
                  onPress={handleModalPress}
                >
                  <View style={styles.indicator} />

                  {/* Header */}
                  <View style={styles.header}>
                    <Text style={styles.title}>
                      {step === 'set' ? 'Set Transaction PIN' : 'Confirm PIN'}
                    </Text>
                    <Text style={styles.subtitle}>
                      {step === 'set' 
                        ? 'Create a 4-digit PIN to secure your transactions'
                        : 'Enter your PIN again to confirm'
                      }
                    </Text>
                  </View>

                  {/* Transaction PIN Section */}
                  <View style={styles.pinSection}>
                    <Text style={styles.pinLabel}>
                      {step === 'set' ? 'Create PIN' : 'Confirm PIN'}
                    </Text>
                    {renderPinDots()}
                    {isLoading && (
                      <Text style={styles.verifyingText}>Setting PIN...</Text>
                    )}
                    
                    {/* Hidden TextInput for system keyboard */}
                    <TextInput
                      style={styles.hiddenInput}
                      value={getCurrentPin()}
                      onChangeText={handlePinChange}
                      keyboardType="numeric"
                      maxLength={maxPinLength}
                      autoFocus={visible}
                      secureTextEntry={false}
                      selectionColor="transparent"
                      caretHidden={true}
                    />
                  </View>

                  <View style={styles.keyboardSpacer} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 44, 44, 0.74)',
    justifyContent: 'flex-end',
  },
  blurView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: -200,
    marginBottom: -400,
  },
  modalContent: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: '70%',
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  pinLabel: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  verifyingText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: '#F5C842',
    marginTop: 8,
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  keyboardSpacer: {
    height: 20,
  },
}); 