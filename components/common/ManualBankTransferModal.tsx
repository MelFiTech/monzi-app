import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Alert, Animated, TextInput, KeyboardAvoidingView, Platform, Keyboard, ImageBackground, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from './Button';
import BankSelectionModal from './BankSelectionModal';
import { Copy, Check, Edit3, Save, XCircle, ChevronDown, RefreshCw } from 'lucide-react-native';
import { ExtractedBankData } from '@/services';
import { useResolveBankAccountMutation } from '@/hooks/useBankServices';
import { ToastService } from '@/services';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ManualBankTransferModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmTransfer: (resolvedAccountName?: string, selectedBankName?: string, accountNumber?: string) => void;
  onSuccess: () => void;
  amount: string;
  nairaAmount: string;
  extractedData?: ExtractedBankData;
  onBankSelect?: (bankName: string) => void;
  capturedImageUri?: string | null;
}

export default function ManualBankTransferModal({
  visible,
  onClose,
  onConfirmTransfer,
  onSuccess,
  amount,
  nairaAmount,
  extractedData,
  onBankSelect,
  capturedImageUri
}: ManualBankTransferModalProps) {
  const { colors, theme } = useTheme();

  const [slideAnim] = useState(new Animated.Value(0));
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBankSelection, setShowBankSelection] = useState(false);
  const [selectedBankName, setSelectedBankName] = useState('');
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(null);
  const [isResolvingAccount, setIsResolvingAccount] = useState(false);
  const [hasResolutionFailed, setHasResolutionFailed] = useState(false);
  const [isEditingAccountNumber, setIsEditingAccountNumber] = useState(false);
  const [editedAccountNumber, setEditedAccountNumber] = useState('');
  const [finalAccountNumber, setFinalAccountNumber] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false);
  const isModalActiveRef = useRef(false);
  const isEditingAccountNumberRef = useRef(false);
  const resolveTimeoutRef = useRef<number | null>(null);
  const isResolvingRef = useRef(false);
  const resolutionDebounceRef = useRef<number | null>(null);

  const resolveAccountMutation = useResolveBankAccountMutation();

  // Use only fresh data - no fallbacks to old data
  const bankName = selectedBankName || '';
  // Prioritize edited/final account number over extracted data
  const accountNumber = finalAccountNumber || editedAccountNumber || '';
  const accountHolderName = resolvedAccountName || '';
  const extractedAmount = extractedData?.amount || amount;

  // Reset all state when modal opens to ensure fresh data
  useEffect(() => {
    if (visible) {
      console.log('🔄 Manual Modal opened - resetting all state and entering edit mode');
      setIsModalActive(true);
      isModalActiveRef.current = true;
      // Reset all persistent state to ensure fresh data
      setSelectedBankName('');
      setResolvedAccountName(null);
      setFinalAccountNumber('');
      setEditedAccountNumber('');
      setHasResolutionFailed(false);
      setIsResolvingAccount(false);
      
      // Check for notification payment data and pre-fill if available
      checkForNotificationPaymentData();
      
      // Auto-enter edit mode when modal opens
      setIsEditingAccountNumber(true);
      isEditingAccountNumberRef.current = true;
    } else {
      // When modal closes, ensure all resolution stops
      console.log('🛑 Manual Modal closed - stopping all resolution');
      setIsModalActive(false);
      isModalActiveRef.current = false;
      setIsResolvingAccount(false);
      
      // Clear any pending timeouts
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
      isResolvingRef.current = false;
    }
  }, [visible]);

  // Check for notification payment data and pre-fill the form
  const checkForNotificationPaymentData = async () => {
    try {
      console.log('🔍 Checking for notification payment data...');
      const notificationData = await AsyncStorage.getItem('notification_payment_data');
      
      if (notificationData) {
        const paymentData = JSON.parse(notificationData);
        console.log('📱 Found notification payment data:', paymentData);
        
        // Pre-fill the form with notification data
        if (paymentData.bankName) {
          setSelectedBankName(paymentData.bankName);
          console.log('🏦 Pre-filled bank name:', paymentData.bankName);
        }
        
        if (paymentData.accountNumber) {
          setFinalAccountNumber(paymentData.accountNumber);
          setEditedAccountNumber(paymentData.accountNumber);
          console.log('📱 Pre-filled account number:', paymentData.accountNumber);
        }
        
        if (paymentData.accountName) {
          setResolvedAccountName(paymentData.accountName);
          console.log('👤 Pre-filled account name:', paymentData.accountName);
        }
        
        // Clear the notification data after using it
        await AsyncStorage.removeItem('notification_payment_data');
        console.log('🧹 Cleared notification payment data');
        
        // Exit edit mode since we have pre-filled data
        setIsEditingAccountNumber(false);
        isEditingAccountNumberRef.current = false;
        console.log('✅ Pre-fill complete, exited edit mode');
      } else {
        console.log('📱 No notification payment data found');
      }
    } catch (error) {
      console.error('❌ Error checking for notification payment data:', error);
    }
  };

  // Debug logging for bank selection and account number
  useEffect(() => {
    console.log('🏦 Manual Bank name state:', {
      selectedBankName,
      finalBankName: bankName
    });
  }, [selectedBankName, bankName]);

  useEffect(() => {
    console.log('📱 Manual Account number state:', {
      finalAccountNumber,
      editedAccountNumber,
      finalAccountNumberUsed: accountNumber,
      isEditing: isEditingAccountNumber
    });
  }, [finalAccountNumber, editedAccountNumber, accountNumber, isEditingAccountNumber]);

  // Check if we have minimum required data
  const hasBankName = Boolean(bankName);
  const hasAccountNumber = Boolean(accountNumber);
  const hasRequiredData = hasBankName && hasAccountNumber; // Both bank name and account number are required

  const resolveAccount = async () => {
    // Prevent resolution if modal is not active
    if (!isModalActiveRef.current) {
      console.log('🚫 Skipping account resolution - manual modal not active');
      return;
    }
    
    // Prevent concurrent resolutions
    if (isResolvingRef.current || isResolvingAccount) {
      console.log('🚫 Skipping account resolution - already resolving');
      return;
    }
    
    if (!hasRequiredData) return;
    
    // Clear any existing timeout
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }
    
    // Set resolving flag
    isResolvingRef.current = true;
    setIsResolvingAccount(true);

    // Guard against invalid data that would cause 400 errors
    if (accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) {
      console.log('🚫 Skipping account resolution - invalid account number:', accountNumber);
      return;
    }

    console.log('🔄 Starting account resolution for bank:', bankName, 'account:', accountNumber);
    setIsResolvingAccount(true);
    setHasResolutionFailed(false);
    
    try {
      const result = await resolveAccountMutation.mutateAsync({
        accountNumber,
        bankName
      });
      if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
      console.log('✅ Account resolution successful:', result);
      setResolvedAccountName(result.account_name);
      setIsResolvingAccount(false);
      isResolvingRef.current = false;
    } catch (error) {
      if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
      console.error('❌ Account resolution failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Only show error and stop retrying if it's a backend error (400, 401, 403, etc.)
      if (errorMessage?.includes('statusCode: 400') || 
          errorMessage?.includes('statusCode: 401') ||
          errorMessage?.includes('statusCode: 403') ||
          errorMessage?.includes('statusCode: 404') ||
          errorMessage?.includes('statusCode: 500')) {
        
        console.log('🚨 Backend error detected, stopping retries');
        setIsResolvingAccount(false);
        setHasResolutionFailed(true);
        isResolvingRef.current = false;
        ToastService.error('Invalid account details');
        return;
      }
      
      // For any error, just stop and let user retry manually
      console.log('❌ Account resolution failed, stopping - user can retry manually');
      setIsResolvingAccount(false);
      isResolvingRef.current = false;
      setHasResolutionFailed(true);
    }
  };

  // Start account resolution when both bank and account number are provided
  useEffect(() => {
    // Don't start resolution if modal is not visible or not active
    if (!visible || !isModalActive) {
      console.log('🚫 Skipping account resolution - manual modal not visible or not active');
      return;
    }
    
    // Don't start resolution if we're already resolving
    if (isResolvingRef.current) {
      console.log('🚫 Skipping account resolution - already resolving');
      return;
    }
    
    // Don't start resolution if we're currently editing (but allow when user taps Done)
    if (isEditingAccountNumber) {
      console.log('🚫 Skipping account resolution - currently in edit mode');
      return;
    }
    
    // Check if we have both criteria met: bank selected AND 10-digit account number
    const hasBankSelected = Boolean(bankName && bankName.trim().length > 0);
    const hasValidAccountNumber = Boolean(accountNumber && accountNumber.length === 10 && /^\d{10}$/.test(accountNumber));
    
    console.log('🔍 Checking resolution criteria:', {
      hasBankSelected,
      hasValidAccountNumber,
      bankName,
      accountNumber,
      accountNumberLength: accountNumber?.length,
      isEditing: isEditingAccountNumber
    });
    
    // Only start resolution if BOTH criteria are met
    if (hasBankSelected && hasValidAccountNumber && !isResolvingAccount) {
      console.log('✅ Both criteria met - starting immediate resolution for:', { accountNumber, bankName });
      
      // Clear any existing debounce timeout
      if (resolutionDebounceRef.current) {
        clearTimeout(resolutionDebounceRef.current);
      }
      
      // Immediate resolution (no debounce for manual modal)
      resolveAccount();
    } else if (!hasBankSelected || !hasValidAccountNumber) {
      console.log('🚫 Skipping account resolution - criteria not met:', {
        hasBankSelected,
        hasValidAccountNumber,
        bankName: bankName || 'not selected',
        accountNumber: accountNumber || 'not entered',
        accountNumberLength: accountNumber?.length || 0
      });
    }
  }, [visible, accountNumber, bankName, isModalActive, isEditingAccountNumber]);

  // Keyboard visibility listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

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

  const handleCopyAmount = () => {
    Alert.alert('Copied', 'Amount copied to clipboard');
  };

  const handleCopyAccountNumber = () => {
    Alert.alert('Copied', 'Account number copied to clipboard');
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleModalPress = (event: any) => {
    event.stopPropagation();
  };

  const handleClosePress = () => {
    Alert.alert(
      'Cancel Transaction',
      'Are you sure you want to cancel this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: onClose,
        },
      ]
    );
  };

  const handleBankSelection = () => {
    setShowBankSelection(true);
  };

  const handleBankSelect = (bankName: string) => {
    console.log('🏦 Bank selected:', bankName);
    setSelectedBankName(bankName);
    setShowBankSelection(false);
    // Reset resolution state when bank changes
    setResolvedAccountName(null);
    setHasResolutionFailed(false);
    setIsResolvingAccount(false); // Ensure we can start a new resolution
    
    // Notify parent component if callback provided
    if (onBankSelect) {
      onBankSelect(bankName);
    }
    
    // Resolution will be handled automatically by useEffect when both criteria are met
    console.log('✅ Bank selected:', bankName);
  };

  const handleEditAccountNumber = () => {
    // Use the current account number (either final, edited, or extracted)
    const currentAccountNumber = finalAccountNumber || editedAccountNumber || '';
    setEditedAccountNumber(currentAccountNumber);
    setIsEditingAccountNumber(true);
    isEditingAccountNumberRef.current = true;
    
    // Aggressively stop any ongoing resolution when editing starts
    console.log('🛑 Stopping all resolution due to edit mode');
    setIsResolvingAccount(false);
    isResolvingRef.current = false;
    setHasResolutionFailed(false);
    
    // Clear any pending timeouts
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }
    
    // Clear any pending debounce timeouts
    if (resolutionDebounceRef.current) {
      clearTimeout(resolutionDebounceRef.current);
      resolutionDebounceRef.current = null;
    }
  };

  const handleSaveAccountNumber = async () => {
    // Validate account number (10 digits)
    if (editedAccountNumber.length !== 10 || !/^\d{10}$/.test(editedAccountNumber)) {
      Alert.alert('Invalid Account Number', 'Account number must be exactly 10 digits.');
      return;
    }
    
    setIsEditingAccountNumber(false);
    isEditingAccountNumberRef.current = false;
    setFinalAccountNumber(editedAccountNumber); // Set the final account number immediately
    
    // Resolution will be handled automatically by useEffect when both criteria are met
    console.log('✅ Account number saved and edit mode exited:', editedAccountNumber);
  };

  const handleCancelEdit = () => {
    setEditedAccountNumber('');
    setIsEditingAccountNumber(false);
    isEditingAccountNumberRef.current = false;
    // Don't reset finalAccountNumber as it should persist
    
    // Resolution will be handled automatically by useEffect when both criteria are met
    console.log('✅ Edit cancelled');
  };

  const handleConfirmPress = async () => {
    if (!hasRequiredData) {
      Alert.alert(
        'Missing Information',
        'Please ensure bank name and account number are available before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    
    // If account resolution is still in progress, wait for it
    if (isResolvingAccount) {
      console.log('⏳ Waiting for account resolution to complete...');
      
      try {
        const result = await resolveAccountMutation.mutateAsync({
          accountNumber,
          bankName
        });
        if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
        console.log('✅ Account resolution completed:', result);
        setResolvedAccountName(result.account_name);
        setIsResolvingAccount(false);
        
        // Continue with transfer
        setTimeout(() => {
          setIsLoading(false);
          onConfirmTransfer(result.account_name, bankName, accountNumber);
        }, 500);
        
      } catch (error) {
        if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
        console.error('❌ Account resolution failed during confirm:', error);
        setIsLoading(false);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Only show error and stop retrying if it's a backend error
        if (errorMessage?.includes('statusCode: 400') || 
            errorMessage?.includes('statusCode: 401') ||
            errorMessage?.includes('statusCode: 403') ||
            errorMessage?.includes('statusCode: 404') ||
            errorMessage?.includes('statusCode: 500')) {
          
          console.log('🚨 Backend error detected during confirm, stopping retries');
          setHasResolutionFailed(true);
          ToastService.error('Invalid account details');
          return;
        }
        
        // For network errors or temporary failures, just show error
        console.log('❌ Account resolution failed during confirm');
        setHasResolutionFailed(true);
        return;
      }
    } else {
      // Resolution already completed or not needed
      setTimeout(() => {
        setIsLoading(false);
        onConfirmTransfer(accountHolderName, bankName, accountNumber);
      }, 500);
    }
  };

  // Render account name with skeleton loading
  const renderAccountName = () => {
    if (isResolvingAccount) {
      return (
        <Text style={[styles.nameValue, {color: 'rgba(255, 255, 255, 0.4)'}]}>
          Verifying...
        </Text>
      );
    }
    
    if (hasResolutionFailed) {
      return (
        <View style={styles.detailValueContainer}>
          <Text style={styles.errorAccountName}>
            Invalid account details
          </Text>
          <TouchableOpacity onPress={() => {
            // Don't retry if modal is not active
            if (!isModalActive) {
              console.log('🚫 Skipping retry - modal not active');
              return;
            }
            // Don't retry if we're currently editing
            if (isEditingAccountNumber) {
              console.log('🚫 Skipping retry - currently editing account number');
              return;
            }
            setHasResolutionFailed(false);
            resolveAccount();
          }}>
            <RefreshCw size={20} color="rgba(255, 107, 107, 0.8)" />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (accountHolderName && accountHolderName !== 'Not found') {
      // Only break into lines if name is longer than 25 characters
      if (accountHolderName.length > 25) {
        const midpoint = Math.ceil(accountHolderName.length / 2);
        const firstLine = accountHolderName.slice(0, midpoint);
        const secondLine = accountHolderName.slice(midpoint);
        
        return (
          <Text style={[styles.nameValue, isEditingAccountNumber && styles.editingText, resolvedAccountName && {color: '#FFE66C'}]}>
            {firstLine}{'\n'}{secondLine}
          </Text>
        );
      }
      
      return (
        <Text style={[styles.nameValue, isEditingAccountNumber && styles.editingText, resolvedAccountName && {color: '#FFE66C'}]}>
          {accountHolderName}
        </Text>
      );
    }
    
    // Show "Waiting for you" when no valid name is available
    return (
      <Text style={[styles.nameValue, {color: 'rgba(255, 255, 255, 0.4)'}]}>
        Waiting for you
      </Text>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClosePress}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1} 
          onPress={onClose}
        >
          <View style={styles.backgroundContainer}>
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.95)']}
              style={styles.gradientOverlay}
            >
              <Animated.View
                style={[
                  styles.modalView,
                  {
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.modalContent}
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                  <LinearGradient
                    colors={['transparent', 'rgb(0, 0, 0)']}
                    style={styles.modalContent}
                  >
                  <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      {renderAccountName()}
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bank Name</Text>
                      <TouchableOpacity onPress={handleBankSelection} style={styles.detailValueContainer}>
                        {hasBankName ? (
                          <Text style={styles.detailValue}>
                            {bankName}
                            {/* Resolving text removed as per instruction */}
                          </Text>
                        ) : (
                          <Text style={styles.nameValue}>Select bank</Text>
                        )}
                        <ChevronDown size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account number</Text>
                      <View style={styles.detailValueContainer}>
                        {isEditingAccountNumber ? (
                          <View style={styles.editContainer}>
                            <TextInput
                              style={styles.editInput}
                              value={editedAccountNumber}
                              onChangeText={setEditedAccountNumber}
                              keyboardType="numeric"
                              maxLength={10}
                              placeholder="Enter 10-digit account number"
                              placeholderTextColor="rgba(255, 255, 255, 0.4)"
                              autoFocus
                            />
                            <TouchableOpacity 
                              onPress={handleSaveAccountNumber} 
                              style={[styles.editPillButton, {backgroundColor: '#FFE66C'}]}
                            >
                              <Text style={[styles.editPillText, {color: '#000000'}]}>Done</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <>
                            {hasAccountNumber ? (
                              <Text style={styles.detailValue}>
                                {accountNumber}
                              </Text>
                            ) : (
                              <Text style={styles.nameValue}>
                                Enter account number
                              </Text>
                            )}
                            <TouchableOpacity onPress={handleEditAccountNumber} style={styles.editPillButton}>
                              <Text style={styles.editPillText}>Edit</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  {!isKeyboardVisible && (
                    <Text style={styles.warningText}>
                      Please confirm the details before sending.{'\n'}Transfers can't be reversed once completed.
                    </Text>
                  )}

                  {!isEditingAccountNumber && (
                    <View style={styles.buttonContainer}>
                      <Button
                        title="Cancel"
                        variant="secondary"
                        size="lg"
                        onPress={handleClosePress}
                        style={styles.recheckButton}
                        textStyle={styles.recheckButtonText}
                      />
                      
                      <Button
                        title={isLoading ? 'Processing...' : 'Confirm'}
                        variant="primary"
                        size="lg"
                        onPress={handleConfirmPress}
                        disabled={isLoading || !hasRequiredData}
                        style={{
                          ...styles.continueButton,
                          ...(!hasRequiredData ? styles.disabledButton : {})
                        }}
                        textStyle={{
                          ...styles.continueButtonText,
                          ...(!hasRequiredData ? styles.disabledButtonText : {})
                        }}
                      />
                    </View>
                  )}
                </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <BankSelectionModal
        visible={showBankSelection}
        onClose={() => setShowBankSelection(false)}
        onSelectBank={handleBankSelect}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  backgroundContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.select({ ios: 0, android: 30 }),
    minHeight: '40%',
  },
  detailsContainer: {
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  detailRow: {
    marginBottom: 20,
    width: '100%',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 10,
    textAlign: 'left',
  },
  nameValue: {
    fontSize: 20,
    fontFamily: fontFamilies.sora.extraBold,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 24,
    textAlign: 'left',
  },
  detailValue: {
    fontSize: 20,
    fontFamily: fontFamilies.sora.extraBold,
    color: '#FFFFFF',
    flex: 1,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  chevronButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  editContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editInput: {
    fontSize: 20,
    fontFamily: fontFamilies.sora.extraBold,
    color: '#FFFFFF',
    paddingHorizontal: 0,
    paddingVertical: 8,
    flex: 1,
    marginRight: 12,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelEditButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
  },
  saveEditButton: {
    padding: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 6,
  },
  skeletonContainer: {
    paddingVertical: 4,
  },
  skeletonLine: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: '70%',
    height: 16,
    marginBottom: 0,
  },
  placeholderName: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
  },
  errorAccountName: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 107, 107, 0.8)',
    fontStyle: 'italic',
  },
  confidenceRow: {
    marginTop: 8,
    marginBottom: 0,
  },
  confidenceText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
  },
  warningText: {
    textAlign: 'left',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    marginBottom: 32,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 34,
  },
  recheckButton: {
    flex: 1,
    backgroundColor: '#242424',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0)',
  },
  recheckButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#FFE66C',
    borderRadius: 25,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#000000',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  selectBankText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: 'rgba(255, 255, 255, 0.4)',
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#242424',
    opacity: 1,
  },
  disabledButtonText: {
    color: '#525252',
  },
  missingDataText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
  },
  editPillButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 62,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 'auto',
  },
  editPillText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
  },
  accountNumberInput: {
    flex: 1,
  },
  editingText: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  resolvingText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
}); 