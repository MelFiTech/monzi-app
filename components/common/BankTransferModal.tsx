import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Alert, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from './Button';
import BankSelectionModal from './BankSelectionModal';
import { Copy, X, Check, ChevronDown } from 'lucide-react-native';
import { ExtractedBankData } from '@/services';
import { useResolveAccountMutation } from '@/hooks/useAccountService';
import { ToastService } from '@/services';
import { router } from 'expo-router';

interface BankTransferModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmTransfer: (resolvedAccountName?: string) => void;
  onSuccess: () => void;
  amount: string;
  nairaAmount: string;
  extractedData?: ExtractedBankData;
  onBankSelect?: (bankName: string) => void;
}

export default function BankTransferModal({
  visible,
  onClose,
  onConfirmTransfer,
  onSuccess,
  amount,
  nairaAmount,
  extractedData,
  onBankSelect
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

  const resolveAccountMutation = useResolveAccountMutation();

  // Use extracted data or selected bank name
  const bankName = extractedData?.bankName || selectedBankName || '';
  const accountNumber = extractedData?.accountNumber || '';
  const accountHolderName = resolvedAccountName || extractedData?.accountHolderName || '';
  const extractedAmount = extractedData?.amount || amount;

  // Check if we have minimum required data
  const hasBankName = Boolean(bankName);
  const hasAccountNumber = Boolean(accountNumber);
  const hasRequiredData = hasBankName && hasAccountNumber;

  // Start account resolution in background when modal opens
  useEffect(() => {
    if (visible && hasRequiredData && !resolvedAccountName && !hasResolutionFailed) {
      console.log('🔄 Starting background account resolution...');
      setIsResolvingAccount(true);
      
      resolveAccountMutation.mutateAsync({
        accountNumber,
        bankName
      })
      .then((result) => {
        console.log('✅ Background account resolution successful:', result);
        setResolvedAccountName(result.account_name);
        setIsResolvingAccount(false);
      })
      .catch((error) => {
        console.error('❌ Background account resolution failed:', error);
        setIsResolvingAccount(false);
        setHasResolutionFailed(true);
        
        // Check for specific error case
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage?.includes('Account verification failed') || 
            errorMessage?.includes('statusCode: 400') ||
            errorMessage?.includes('Bad Request')) {
          
          console.log('🚨 Specific account verification error detected');
          ToastService.error('Please scan again');
          
          // Close modal and navigate to home
          setTimeout(() => {
            onClose();
            router.replace('/(tabs)');
          }, 1000);
        }
      });
    }
  }, [visible, hasRequiredData, resolvedAccountName, hasResolutionFailed, accountNumber, bankName]);

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
    setSelectedBankName(bankName);
    setShowBankSelection(false);
    // Reset resolution state when bank changes
    setResolvedAccountName(null);
    setHasResolutionFailed(false);
    // Notify parent component if callback provided
    if (onBankSelect) {
      onBankSelect(bankName);
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
        console.log('✅ Account resolution completed:', result);
        setResolvedAccountName(result.account_name);
        setIsResolvingAccount(false);
        
                 // Continue with transfer
         setTimeout(() => {
           setIsLoading(false);
           onConfirmTransfer(resolvedAccountName || undefined);
         }, 500);
        
      } catch (error) {
        console.error('❌ Account resolution failed during confirm:', error);
        setIsLoading(false);
        setHasResolutionFailed(true);
        
        // Check for specific error case
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage?.includes('Account verification failed') || 
            errorMessage?.includes('statusCode: 400') ||
            errorMessage?.includes('Bad Request')) {
          
          ToastService.error('Please scan again');
          
          // Close modal and navigate to home
          setTimeout(() => {
            onClose();
            router.replace('/(tabs)');
          }, 1000);
        } else {
          Alert.alert('Error', 'Failed to verify account details. Please try again.');
        }
        return;
      }
         } else {
       // Resolution already completed or not needed
       setTimeout(() => {
         setIsLoading(false);
         onConfirmTransfer(resolvedAccountName || undefined);
       }, 500);
     }
  };

  // Render account name with skeleton loading
  const renderAccountName = () => {
    if (isResolvingAccount) {
      return (
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
      );
    }
    
    if (hasResolutionFailed) {
      return (
        <Text style={styles.errorAccountName}>
          Unable to verify account name
        </Text>
      );
    }
    
    if (accountHolderName) {
      return (
        <Text style={styles.nameValue}>
          {accountHolderName.includes(' ') 
            ? accountHolderName.replace(' ', '\n') 
            : accountHolderName
          }
        </Text>
      );
    }
    
    return (
      <Text style={styles.placeholderName}>
        Resolving account name...
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
      <View style={styles.overlay}>
        <BlurView intensity={8} style={styles.blurView}>
          <View style={styles.modalContainer}>
            <Animated.View
              style={{
                transform: [{ translateY: slideAnim }]
              }}
            >
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={handleModalPress}
              >
                <View style={styles.header}>
                  <TouchableOpacity onPress={handleClosePress} style={styles.closeButton}>
                    <X size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.headerText}>Transfer to</Text>
                  <View style={styles.spacer} />
                </View>

                <View style={styles.detailsCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    {renderAccountName()}
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bank Name</Text>
                    {hasBankName ? (
                      <Text style={styles.detailValue}>
                        {bankName}
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleBankSelection} style={styles.selectBankButton}>
                        <Text style={styles.selectBankText}>Select bank</Text>
                        <ChevronDown size={16} color="#6CB1FF" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account number</Text>
                    <View style={styles.detailValueContainer}>
                      {hasAccountNumber ? (
                        <>
                          <Text style={styles.detailValue}>
                            {accountNumber}
                          </Text>
                          <TouchableOpacity onPress={handleCopyAccountNumber} style={styles.copyButton}>
                            {copied ? (
                              <Check size={20} color="#10B981" />
                            ) : (
                              <Copy size={20} color="rgba(255, 255, 255, 0.6)" />
                            )}
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={styles.missingDataText}>
                          Not detected - Please retake photo
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Show extraction confidence if available */}
                  {extractedData && (
                    <View style={styles.confidenceRow}>
                      <Text style={styles.confidenceText}>
                        Extraction confidence: {extractedData.confidence}%
                      </Text>
                    </View>
                  )}
                </View>

                {!hasRequiredData ? (
                  <View style={styles.warningContainer}>
                    <Text style={styles.errorText}>
                      ⚠️ Missing Required Information
                    </Text>
                    <Text style={styles.errorDetails}>
                      {!hasBankName && !hasAccountNumber ? 
                        'Bank name and account number are required.' :
                        !hasBankName ? 'Please select a bank name.' :
                        'Account number not detected. Please retake photo.'
                      }
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.warningText}>
                    Please confirm the details before sending.{'\n'}Transfers can't be reversed once completed.
                  </Text>
                )}

                <View style={styles.buttonContainer}>
                  <Button
                    title="Recheck"
                    variant="secondary"
                    size="lg"
                    onPress={handleClosePress}
                    style={styles.recheckButton}
                    textStyle={styles.recheckButtonText}
                  />
                  
                  <Button
                    title={isLoading ? 'Processing...' : 'Continue'}
                    variant="primary"
                    size="lg"
                    onPress={handleConfirmPress}
                    disabled={isLoading || !hasRequiredData}
                    style={{
                      ...styles.continueButton,
                      ...((!hasRequiredData) ? styles.disabledButton : {})
                    }}
                    textStyle={{
                      ...styles.continueButtonText,
                      ...((!hasRequiredData) ? styles.disabledButtonText : {})
                    }}
                  />
                </View>

              </TouchableOpacity>
            </Animated.View>
          </View>
        </BlurView>
      </View>

      {/* Bank Selection Modal */}
      <BankSelectionModal
        visible={showBankSelection}
        onClose={() => setShowBankSelection(false)}
        onSelectBank={handleBankSelect}
      />
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
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 24,
  },
  headerText: {
    fontSize: 24,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  nameValue: {
    fontSize: 20,
    fontFamily: fontFamilies.sora.bold,
    color: '#F5C842',
    lineHeight: 24,
  },
  detailValue: {
    fontSize: 20,
    fontFamily: fontFamilies.sora.bold,
    color: '#FFFFFF',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyButton: {
    padding: 4,
  },
  // Skeleton loading styles
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
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    marginBottom: 32,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  recheckButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    borderWidth: 0,
  },
  recheckButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#A7A7A7',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#F5C842',
    borderRadius: 25,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#000000',
  },
  selectBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(108, 177, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6CB1FF',
  },
  selectBankText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#6CB1FF',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  missingDataText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
  },
  warningContainer: {
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F5C842',
  },
  errorText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.bold,
    color: '#F5C842',
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
});