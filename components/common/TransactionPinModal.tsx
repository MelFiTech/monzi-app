import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';
import RecipientDetailCard from './RecipientDetailCard';

interface TransactionPinModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  recipientName: string;
  accountNumber: string;
  bankName: string;
  amount: string;
  fee?: string;
}

export default function TransactionPinModal({
  visible,
  onClose,
  onConfirm,
  recipientName,
  accountNumber,
  bankName,
  amount,
  fee = '10.00',
}: TransactionPinModalProps) {
  const { colors } = useTheme();
  const [slideAnim] = useState(new Animated.Value(0));
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const maxPinLength = 4;
  const panY = useRef(new Animated.Value(0)).current;

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

  // Reset PIN when modal closes
  useEffect(() => {
    if (!visible) {
      setPin('');
      setIsLoading(false);
      panY.setValue(0);
    }
  }, [visible]);

  const handlePinChange = (text: string) => {
    // Only allow numeric input and limit to maxPinLength
    const numericValue = text.replace(/[^\d]/g, '').slice(0, maxPinLength);
    setPin(numericValue);
    
    // Auto-submit when PIN is complete
    if (numericValue.length === maxPinLength) {
      setTimeout(() => {
        handleConfirm(numericValue);
      }, 200);
    }
  };

  const handleConfirm = async (pinToSubmit: string) => {
    setIsLoading(true);
    
    // Simulate PIN verification
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(pinToSubmit);
    }, 1000);
  };

  const handleModalPress = (event: any) => {
    event.stopPropagation();
  };

  const handleClosePress = () => {
    Alert.alert(
      'Cancel Transaction',
      'Are you sure you want to cancel this transaction?',
      [
        {
          text: 'Continue',
          style: 'cancel',
        },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: onClose,
        },
      ]
    );
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {Array.from({ length: maxPinLength }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              {
                backgroundColor: index < pin.length ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
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

                  {/* Recipient Details */}
                  <RecipientDetailCard
                    name={recipientName}
                    accountNumber={accountNumber}
                    bankName={bankName}
                  />

                  {/* Transaction Details */}
                  <View style={styles.transactionDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={styles.amountValue}>N{amount}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fee</Text>
                      <Text style={styles.feeValue}>N{fee}</Text>
                    </View>
                  </View>

                  {/* Transaction PIN Section */}
                  <View style={styles.pinSection}>
                    <Text style={styles.pinLabel}>Transaction PIN</Text>
                    {renderPinDots()}
                    {isLoading && (
                      <Text style={styles.verifyingText}>Verifying PIN...</Text>
                    )}
                    
                    {/* Hidden TextInput for system keyboard */}
                    <TextInput
                      style={styles.hiddenInput}
                      value={pin}
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
  transactionDetails: {
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  amountValue: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.bold,
    color: '#F5C842',
  },
  feeValue: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.bold,
    color: '#FFFFFF',
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: 32,
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