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
import { useResolveBankAccountMutation, useSuperResolveBankAccountMutation } from '@/hooks/useBankServices';
import { ToastService } from '@/services';
import { router } from 'expo-router';

interface BankTransferModalProps {
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

export default function BankTransferModal({
  visible,
  onClose,
  onConfirmTransfer,
  onSuccess,
  amount,
  nairaAmount,
  extractedData,
  onBankSelect,
  capturedImageUri
}: BankTransferModalProps) {
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
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false);
  const isModalActiveRef = useRef(false);
  const isEditingAccountNumberRef = useRef(false);
  const resolveTimeoutRef = useRef<number | null>(null);
  const isResolvingRef = useRef(false);
  const resolutionDebounceRef = useRef<number | null>(null);
  const MAX_RETRIES = 5; // Kept for compatibility but not used

  const resolveAccountMutation = useResolveBankAccountMutation();
  // const superResolveAccountMutation = useSuperResolveBankAccountMutation();

  // Use only fresh data - no fallbacks to old data
  const bankName = selectedBankName || extractedData?.bankName || '';
  // Prioritize edited/final account number over extracted data
  const accountNumber = finalAccountNumber || editedAccountNumber || extractedData?.accountNumber || '';
  const accountHolderName = resolvedAccountName || extractedData?.accountHolderName || '';
  const extractedAmount = extractedData?.amount || amount;

  // Reset all state when modal opens to ensure fresh data
  useEffect(() => {
    if (visible) {
      console.log('🔄 Modal opened - resetting all state');
      setIsModalActive(true);
      isModalActiveRef.current = true;
      // Reset all persistent state to ensure fresh data
      setSelectedBankName('');
      setResolvedAccountName(null);
      setFinalAccountNumber('');
      setEditedAccountNumber('');
      setHasResolutionFailed(false);
      setIsResolvingAccount(false);
      setRetryCount(0);
      setIsAutoRetrying(false);
      setIsEditingAccountNumber(false);
      isEditingAccountNumberRef.current = false;
      
      // Only set data from fresh extraction, no fallbacks
      if (extractedData?.accountNumber) {
        setFinalAccountNumber(extractedData.accountNumber);
      }
    } else {
      // When modal closes, ensure all resolution stops
      console.log('🛑 Modal closed - stopping all resolution');
      setIsModalActive(false);
      isModalActiveRef.current = false;
      setIsResolvingAccount(false);
      setIsAutoRetrying(false);
      setRetryCount(0);
      
      // Clear any pending timeouts
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
      isResolvingRef.current = false;
    }
  }, [visible, extractedData]);

  // Debug logging for bank selection and account number
  useEffect(() => {
    console.log('🏦 Bank name state:', {
      selectedBankName,
      extractedBankName: extractedData?.bankName,
      finalBankName: bankName
    });
  }, [selectedBankName, extractedData?.bankName, bankName]);

  useEffect(() => {
    console.log('📱 Account number state:', {
      finalAccountNumber,
      editedAccountNumber,
      extractedAccountNumber: extractedData?.accountNumber,
      finalAccountNumberUsed: accountNumber,
      isEditing: isEditingAccountNumber
    });
  }, [finalAccountNumber, editedAccountNumber, extractedData?.accountNumber, accountNumber, isEditingAccountNumber]);

  // Check if we have minimum required data
  const hasBankName = Boolean(bankName);
  const hasAccountNumber = Boolean(accountNumber);
  const hasRequiredData = hasBankName && hasAccountNumber; // Both bank name and account number are required

  const resolveAccount = async () => {
    // Prevent resolution if modal is not active
    if (!isModalActiveRef.current) {
      console.log('🚫 Skipping account resolution - modal not active');
      return;
    }
    // Prevent resolution if we're currently editing
    if (isEditingAccountNumberRef.current) {
      console.log('🚫 Skipping account resolution - currently editing account number');
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

    // Check if we have bank name for normal resolution or need super resolve
    const hasBankName = bankName && bankName.trim().length > 0;
    
    if (hasBankName) {
      console.log('🔄 Starting normal account resolution for bank:', bankName, 'account:', accountNumber);
      setIsResolvingAccount(true);
      setHasResolutionFailed(false);
      setIsAutoRetrying(false);
      
      try {
        const result = await resolveAccountMutation.mutateAsync({
          accountNumber,
          bankName
        });
        if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
        console.log('✅ Normal account resolution successful:', result);
        setResolvedAccountName(result.account_name);
        setIsResolvingAccount(false);
        setRetryCount(0); // Reset retry count on success
        setIsAutoRetrying(false);
      } catch (error) {
        if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
        console.error('❌ Normal account resolution failed:', error);
        
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
          setIsAutoRetrying(false);
          ToastService.error('Invalid account details');
          return;
        }
        
        // For any error, just stop and let user retry manually
        console.log('❌ Account resolution failed, stopping - user can retry manually');
        setIsResolvingAccount(false);
        isResolvingRef.current = false;
        setHasResolutionFailed(true);
        setIsAutoRetrying(false);
        // Don't show error toast - let user retry by editing
      }
    } else {
      // No bank name available, skip resolution
      console.log('🚫 Skipping account resolution - no bank name selected');
      setIsResolvingAccount(false);
      isResolvingRef.current = false;
      setHasResolutionFailed(false);
      setIsAutoRetrying(false);
      return;
    }
  };

  // Start account resolution in background when modal opens or when bank/account changes
  useEffect(() => {
    // Don't start resolution if modal is not visible or not active
    if (!visible || !isModalActive) {
      console.log('🚫 Skipping account resolution - modal not visible or not active');
      return;
    }
    
    // Don't start resolution if we're currently editing
    if (isEditingAccountNumber) {
      console.log('🚫 Skipping account resolution - currently in edit mode');
      return;
    }
    
    // Don't start resolution if we're already resolving
    if (isResolvingRef.current) {
      console.log('🚫 Skipping account resolution - already resolving');
      return;
    }
    
    if (hasRequiredData && !isResolvingAccount) {
      // Additional validation to prevent resolution with invalid data
      if (accountNumber && accountNumber.length === 10 && /^\d{10}$/.test(accountNumber) && bankName) {
        // Allow resolution only if we have both bank name and account number
        console.log('🔄 useEffect triggered resolution for:', { accountNumber, bankName });
        
        // Clear any existing debounce timeout
        if (resolutionDebounceRef.current) {
          clearTimeout(resolutionDebounceRef.current);
        }
        
        // Debounce resolution to prevent rapid-fire calls
        resolutionDebounceRef.current = setTimeout(() => {
          if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
          resolveAccount();
        }, 500); // 500ms debounce
      } else {
        console.log('🚫 Skipping account resolution - data validation failed:', {
          accountNumber,
          accountNumberLength: accountNumber?.length,
          bankName,
          bankNameLength: bankName?.length
        });
      }
    }
  }, [visible, accountNumber, isEditingAccountNumber, isModalActive]);

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
    setRetryCount(0); // Reset retry count
    // Notify parent component if callback provided
    if (onBankSelect) {
      onBankSelect(bankName);
    }
    // Show success feedback
            // ToastService.success(`${bankName} selected`); // Removed - no toast on bank selection
    
    // If we have an account number, trigger resolution immediately
    if (accountNumber) {
      console.log('🔄 Triggering immediate resolution for new bank selection');
    }
  };

  const handleEditAccountNumber = () => {
    // Use the current account number (either final, edited, or extracted)
    const currentAccountNumber = finalAccountNumber || editedAccountNumber || extractedData?.accountNumber || '';
    setEditedAccountNumber(currentAccountNumber);
    setIsEditingAccountNumber(true);
    isEditingAccountNumberRef.current = true;
    
    // Aggressively stop any ongoing resolution when editing starts
    console.log('🛑 Stopping all resolution due to edit mode');
    setIsResolvingAccount(false);
    isResolvingRef.current = false;
    setIsAutoRetrying(false);
    setRetryCount(0);
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
    setRetryCount(0); // Reset retry count
    setIsAutoRetrying(false);
    setFinalAccountNumber(editedAccountNumber); // Set the final account number immediately
    
    // Clear any pending timeouts before starting fresh resolution
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }
    
    // Clear any pending debounce timeouts
    if (resolutionDebounceRef.current) {
      clearTimeout(resolutionDebounceRef.current);
      resolutionDebounceRef.current = null;
    }
    
    // If we have account number, trigger resolution (with or without bank name)
    if (editedAccountNumber) {
      const hasBankNameForEdit = bankName && bankName.trim().length > 0;
      
      if (hasBankNameForEdit) {
        console.log('🔄 Starting fresh resolution for edited account number:', editedAccountNumber, 'bank:', bankName);
        setIsResolvingAccount(true);
        isResolvingRef.current = true;
        setHasResolutionFailed(false);
        setResolvedAccountName(null);
        
        try {
          const result = await resolveAccountMutation.mutateAsync({
            accountNumber: editedAccountNumber,
            bankName
          });
          if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
          console.log('✅ Account resolution successful for edited account:', result);
          setResolvedAccountName(result.account_name);
          setIsResolvingAccount(false);
          isResolvingRef.current = false;
          setIsAutoRetrying(false);
        } catch (error) {
          if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
          console.error('❌ Account resolution failed for edited account:', error);
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Only show error and stop retrying if it's a backend error
          if (errorMessage?.includes('statusCode: 400') || 
              errorMessage?.includes('statusCode: 401') ||
              errorMessage?.includes('statusCode: 403') ||
              errorMessage?.includes('statusCode: 404') ||
              errorMessage?.includes('statusCode: 500')) {
            
            console.log('🚨 Backend error detected for edited account, stopping retries');
            setIsResolvingAccount(false);
            isResolvingRef.current = false;
            setHasResolutionFailed(true);
            setIsAutoRetrying(false);
            ToastService.error('Invalid account number');
            return;
          }
          
          // For any error, just stop and let user retry manually
          console.log('❌ Account resolution failed, stopping - user can retry manually');
          setIsResolvingAccount(false);
          isResolvingRef.current = false;
          setHasResolutionFailed(true);
          setIsAutoRetrying(false);
          // Don't show error toast - let user retry by editing
        }
      } else {
        // No bank name, skip resolution
        console.log('🚫 Skipping account resolution for edited account - no bank name selected');
        setIsResolvingAccount(false);
        isResolvingRef.current = false;
        setHasResolutionFailed(false);
        setResolvedAccountName(null);
        setIsAutoRetrying(false);
        return;
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedAccountNumber('');
    setIsEditingAccountNumber(false);
    isEditingAccountNumberRef.current = false;
    // Don't reset finalAccountNumber as it should persist
    
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
    
    // Resume resolution if we have valid data and not editing
    if (hasRequiredData && !isResolvingAccount && !isEditingAccountNumber && isModalActive) {
      console.log('🔄 Resuming resolution after canceling edit');
      setTimeout(() => {
        resolveAccount();
      }, 100);
    }
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
        setRetryCount(0); // Reset retry count on success
        setIsAutoRetrying(false);
        
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
          setIsAutoRetrying(false);
          ToastService.error('Invalid account details');
          return;
        }
        
        // For network errors or temporary failures, auto-retry
        if (retryCount < MAX_RETRIES && isModalActiveRef.current) {
          console.log(`🔄 Auto-retrying resolution during confirm (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(prev => prev + 1);
          setIsAutoRetrying(true);
          
          setTimeout(() => {
            if (!isModalActiveRef.current || isEditingAccountNumberRef.current) return;
            handleConfirmPress();
          }, 2000);
        } else {
          console.log('❌ Max retries reached during confirm, but not showing error');
          setHasResolutionFailed(false); // Don't show error state
          setIsAutoRetrying(false);
          // Don't show error toast or navigate away
        }
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
          {isAutoRetrying ? `Retrying (${retryCount}/${MAX_RETRIES})...` : 'Verifying...'}
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
            setRetryCount(0);
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
          onPress={Keyboard.dismiss}
        >
          {capturedImageUri && (
            <ImageBackground
              source={{ uri: capturedImageUri }}
              style={styles.imageBackground}
            >
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
                              {isResolvingAccount && (
                                <Text style={styles.resolvingText}> • Resolving...</Text>
                              )}
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

                      {/* Show extraction confidence if available and keyboard is not visible */}
                      {extractedData && !isKeyboardVisible && (
                        <View style={styles.confidenceRow}>
                          <Text style={styles.confidenceText}>
                            Extraction confidence: {extractedData.confidence}%
                          </Text>
                        </View>
                      )}
                    </View>

                    {!isKeyboardVisible && (
                      <Text style={styles.warningText}>
                        Please confirm the details before sending.{'\n'}Transfers can't be reversed once completed.
                      </Text>
                    )}

                    {!isEditingAccountNumber && (
                      <View style={styles.buttonContainer}>
                        <Button
                          title="Rescan"
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
                </Animated.View>
              </LinearGradient>
            </ImageBackground>
          )}
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