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
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';
import { useBiometricService } from '@/hooks/useBiometricService';
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
  feeLoading?: boolean;
  pinError?: string;
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
  feeLoading = false,
  pinError,
}: TransactionPinModalProps) {
  const { colors } = useTheme();
  const { 
    checkAvailability, 
    getBiometricType, 
    authenticate, 
    storePin, 
    getStoredPin, 
    isBiometricEnabled 
  } = useBiometricService();
  
  const [slideAnim] = useState(new Animated.Value(0));
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string[]>([]);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);

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

  // Check biometric availability and enrollment status
  useEffect(() => {
    const checkBiometrics = async () => {
      console.log('🔍 [TransactionModal] Starting biometric check...');
      
      const available = await checkAvailability();
      setBiometricAvailable(available);
      
      console.log('🔍 [TransactionModal] Biometric check:', { available });
      
      if (available) {
        const types = await getBiometricType();
        setBiometricType(types);
        
        const enabled = await isBiometricEnabled();
        setBiometricEnabled(enabled);
        
        console.log('🔍 [TransactionModal] Biometric status:', { 
          types, 
          enabled,
          showPinInput: !enabled 
        });
        
        // Set initial display mode
        setShowPinInput(!enabled); // Show PIN input only if Face ID not enabled
        
        // Double-check: if enabled is true, make sure we have a stored PIN
        if (enabled) {
          const storedPin = await getStoredPin();
          if (!storedPin) {
            console.log('⚠️ [TransactionModal] Biometric enabled but no stored PIN found, resetting...');
            setBiometricEnabled(false);
            setShowPinInput(true);
          } else {
            console.log('✅ [TransactionModal] Biometric enabled and PIN confirmed stored');
            
            // AUTO-SCAN: Try Face ID immediately when modal opens
            console.log('🔄 [TransactionModal] Auto-starting Face ID scan...');
            setTimeout(() => {
              handleBiometricAuth(true);
            }, 500); // Small delay to ensure modal is fully visible
          }
        }
      } else {
        // No biometric available, always show PIN input
        setShowPinInput(true);
        setBiometricEnabled(false);
        
        console.log('🔍 [TransactionModal] No biometric available, showing PIN input');
      }
    };
    
    if (visible) {
      // Small delay to ensure modal is fully mounted
      setTimeout(checkBiometrics, 100);
    }
  }, [visible]);

  // Set error from props
  useEffect(() => {
    if (pinError) {
      setCurrentError(pinError);
      // If there's a PIN error, show PIN input for retry
      setShowPinInput(true);
      console.log('🔍 [TransactionModal] PIN error received, showing PIN input');
    }
  }, [pinError]);

  // Debug: Log current state changes
  useEffect(() => {
    console.log('🔍 [TransactionModal] State update:', {
      biometricAvailable,
      biometricEnabled,
      showPinInput,
      isLoading,
      hasError: !!currentError
    });
  }, [biometricAvailable, biometricEnabled, showPinInput, isLoading, currentError]);

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
      setIsLoading(false);
      setCurrentError(null);
      setShowPinInput(false);
      panY.setValue(0);
    }
  }, [visible]);

  const handlePinChange = (text: string) => {
    // Clear error when user starts typing
    if (currentError) {
      setCurrentError(null);
    }
    
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
    setCurrentError(null);
    
    try {
      // Store PIN for biometric authentication if available and not already enabled
      if (biometricAvailable && !biometricEnabled) {
        console.log('🔐 [TransactionModal] Storing PIN for biometric authentication...');
        const stored = await storePin(pinToSubmit);
        if (stored) {
          setBiometricEnabled(true);
          console.log('✅ [TransactionModal] PIN stored successfully for future biometric authentication');
          
          // Show success message for first-time setup
          setTimeout(() => {
            Alert.alert(
              'Face ID Enabled',
              `${biometricType[0] || 'Biometric'} authentication has been enabled for faster transactions.`,
              [{ text: 'Great!' }]
            );
          }, 500);
        } else {
          console.error('❌ [TransactionModal] Failed to store PIN for biometric authentication');
        }
      }
      
      // Simulate verification delay
      setTimeout(() => {
        setIsLoading(false);
        onConfirm(pinToSubmit);
      }, 1000);
      
    } catch (error) {
      console.error('❌ [TransactionModal] Error in handleConfirm:', error);
      setIsLoading(false);
      setCurrentError('An error occurred. Please try again.');
    }
  };

  const handleBiometricAuth = async (isAutoScan = false) => {
    try {
      setIsLoading(true);
      setCurrentError(null);
      
      console.log('🔐 [TransactionModal] Starting biometric authentication...', isAutoScan ? '(auto-scan)' : '(manual)');
      const result = await authenticate('Authenticate to complete transfer');
      
      if (result.success) {
        console.log('✅ [TransactionModal] Biometric authentication successful');
        // Get stored PIN
        const storedPin = await getStoredPin();
        
        if (storedPin) {
          console.log('✅ [TransactionModal] Retrieved stored PIN successfully');
          setIsLoading(false);
          onConfirm(storedPin);
        } else {
          console.error('❌ [TransactionModal] No stored PIN found');
          setIsLoading(false);
          setCurrentError('Stored PIN not found. Please enter your PIN.');
          setShowPinInput(true);
        }
      } else {
        console.error('❌ [TransactionModal] Biometric authentication failed:', result.error);
        setIsLoading(false);
        
        if (isAutoScan) {
          // For auto-scan failures, just show the Face ID button for manual retry
          console.log('🔄 [TransactionModal] Auto-scan failed, showing Face ID button for manual retry');
          setCurrentError(null); // Don't show error for auto-scan failure
          // Keep showPinInput as false to show Face ID button
        } else {
          // For manual failures, show error and allow PIN fallback
          setCurrentError(result.error || 'Face ID authentication failed');
          // Keep showPinInput as false initially, user can tap "Use PIN instead" if needed
        }
      }
    } catch (error) {
      console.error('❌ [TransactionModal] Biometric authentication error:', error);
      setIsLoading(false);
      
      if (isAutoScan) {
        // For auto-scan errors, just show the Face ID button for manual retry
        console.log('🔄 [TransactionModal] Auto-scan error, showing Face ID button for manual retry');
        setCurrentError(null); // Don't show error for auto-scan failure
      } else {
        // For manual errors, show error message
        setCurrentError('Face ID authentication failed');
      }
    }
  };

  const handleBiometricButtonPress = () => {
    handleBiometricAuth(false);
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

  const renderBiometricOnly = () => {
    if (!biometricAvailable || !biometricEnabled) {
      console.log('🔍 [TransactionModal] Not showing Face ID:', { biometricAvailable, biometricEnabled });
      return null;
    }
    
    const biometricName = biometricType[0] || 'Biometric';
    console.log('✅ [TransactionModal] Showing Face ID button:', { biometricName });
    
    return (
      <View style={styles.biometricOnlySection}>
        <TouchableOpacity
          style={styles.biometricOnlyButton}
          onPress={handleBiometricButtonPress}
          disabled={isLoading}
        >
          <Image
            source={require('@/assets/icons/profile/face-id.png')}
            style={[
              styles.biometricOnlyIcon,
              { opacity: isLoading ? 0.5 : 1 }
            ]}
          />
        </TouchableOpacity>
        <Text style={styles.biometricOnlyLabel}>
          {isLoading ? 'Authenticating...' : `Tap to use ${biometricName}`}
        </Text>
        
        {/* Manual PIN fallback */}
        <TouchableOpacity
          style={styles.fallbackButton}
          onPress={() => setShowPinInput(true)}
          disabled={isLoading}
        >
          <Text style={styles.fallbackText}>Use PIN instead</Text>
        </TouchableOpacity>
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
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={handleClosePress}
      >
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
                      {feeLoading ? (
                        <View style={{ width: 40, height: 18, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                      ) : fee !== undefined ? (
                      <Text style={styles.feeValue}>N{fee}</Text>
                      ) : (
                        <Text style={styles.feeValue}>--</Text>
                      )}
                    </View>
                  </View>

                  {/* Authentication Section */}
                  <View style={styles.authSection}>
                    <Text style={styles.authTitle}>Authenticate Transaction</Text>
                    
                    {/* Show error if any */}
                    {currentError && (
                      <Text style={styles.errorText}>{currentError}</Text>
                    )}

                    {/* Show either PIN input or Biometric only */}
                    {showPinInput ? (
                      // PIN Section
                      <View style={styles.pinSection}>
                        <Text style={styles.pinLabel}>Enter PIN</Text>
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
                          selectionColor="transparent"
                          caretHidden={true}
                        />
                      </View>
                    ) : (
                      // Biometric Only Section
                      renderBiometricOnly()
                    )}
                  </View>

                  <View style={styles.keyboardSpacer} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </TouchableOpacity>
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
    minHeight: '75%',
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
  authSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  authTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: '#FF6B6B',
    marginBottom: 16,
    textAlign: 'center',
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: 20,
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
  biometricOnlySection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  biometricOnlyButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  biometricOnlyIcon: {
    width: 40,
    height: 40,
    tintColor: '#FFFFFF',
  },
  biometricOnlyLabel: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  fallbackButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  keyboardSpacer: {
    height: 20,
  },
}); 