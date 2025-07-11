import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';
import { ArrowLeft } from 'lucide-react-native';
import RecipientDetailCard from '@/components/common/RecipientDetailCard';
import AmountPill from '@/components/common/AmountPill';
import Button from '@/components/common/Button';
import TransactionPinModal from '@/components/common/TransactionPinModal';
import { useWalletBalance, useRefreshWallet, useOptimisticBalance, useTransferFunds, useWalletAccessStatus } from '@/hooks/useWalletService';
import { useNotificationService } from '@/hooks/useNotificationService';
import { useQueryClient } from '@tanstack/react-query';

const predefinedAmounts = ['N5,000', 'N10,000', 'N20,000'];

export default function TransferScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  
  // Extract navigation params (from camera extraction)
  const extractedBankName = params.bankName as string || '';
  const extractedAccountNumber = params.accountNumber as string || '';
  const extractedAccountHolderName = params.accountHolderName as string || '';
  const extractedAmount = params.amount as string || '';

  // Set initial states based on extracted data
  const [amount, setAmount] = useState(extractedAmount || '');
  const [selectedPill, setSelectedPill] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check wallet access status
  const { hasWalletAccess, statusMessage } = useWalletAccessStatus();

  // Fetch wallet balance only if user has access
  const { data: balanceData, isLoading: isBalanceLoading } = useWalletBalance();
  const { invalidateAfterTransaction } = useRefreshWallet();
  const { updateBalanceOptimistically, revertOptimisticUpdate } = useOptimisticBalance();
  const transferFundsMutation = useTransferFunds();

  // Real-time notifications for wallet updates
  const { 
    isConnected: isNotificationConnected,
    lastWalletUpdate,
    formatAmount: formatNotificationAmount
  } = useNotificationService(
    {
      autoConnect: true,
      showToasts: true,
      enableBalanceUpdates: true,
      enableTransactionNotifications: true,
      enableGeneralNotifications: true,
    },
    {
      onWalletBalanceUpdate: (notification) => {
        console.log('🔔 [TransferScreen] Real-time wallet update received:', {
          component: 'TransferScreen',
          timestamp: new Date().toISOString(),
          eventType: 'wallet_balance_updated',
          fullNotification: notification,
          balanceChange: {
            oldBalance: formatNotificationAmount(notification.data.oldBalance),
            newBalance: formatNotificationAmount(notification.data.newBalance),
            changeAmount: formatNotificationAmount(notification.data.amount),
            isCredit: notification.data.amount > 0,
            isDebit: notification.data.amount < 0,
          },
          transaction: {
            reference: notification.data.transactionReference,
            accountNumber: notification.data.accountNumber,
            description: notification.data.description,
            timestamp: notification.data.timestamp,
          },
          transferScreenState: {
            currentAmount: amount,
            hasAmountError: !!amountError,
            amountErrorMessage: amountError,
          }
        });
        
        // Log balance comparison
        if (notification.data.amount > 0) {
          console.log(`💰 [TransferScreen] WALLET CREDITED: +${formatNotificationAmount(notification.data.amount)} | New Balance: ${formatNotificationAmount(notification.data.newBalance)}`);
        } else if (notification.data.amount < 0) {
          console.log(`💸 [TransferScreen] WALLET DEBITED: ${formatNotificationAmount(notification.data.amount)} | New Balance: ${formatNotificationAmount(notification.data.newBalance)}`);
        }
        
        // Invalidate wallet queries to refresh balance display in real-time
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
        queryClient.invalidateQueries({ queryKey: ['wallet', 'details'] });
        queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
        
        console.log('🔄 [TransferScreen] React Query cache invalidated for wallet data');
        
        // Clear any amount errors if balance increased
        if (notification.data.amount > 0 && amountError?.includes('balance')) {
          setAmountError(null);
          console.log('✅ [TransferScreen] Amount error cleared due to balance increase');
        }
      },
      onTransactionNotification: (notification) => {
        console.log('💳 [TransferScreen] Real-time transaction notification received:', {
          component: 'TransferScreen',
          timestamp: new Date().toISOString(),
          eventType: 'transaction_notification',
          fullNotification: notification,
          transaction: {
            type: notification.data.type,
            amount: formatNotificationAmount(notification.data.amount),
            reference: notification.data.transactionReference,
            accountNumber: notification.data.accountNumber,
            description: notification.data.description,
            status: notification.data.status,
            timestamp: notification.data.timestamp,
          },
          transferScreenState: {
            currentAmount: amount,
            hasAmountError: !!amountError,
            isProcessingTransfer: transferFundsMutation.isPending,
          }
        });
        
        console.log(`💳 [TransferScreen] TRANSACTION ${notification.data.type.toUpperCase()}: ${formatNotificationAmount(notification.data.amount)} | Status: ${notification.data.status}`);
        
        // Refresh wallet data for any transaction
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        
        console.log('🔄 [TransferScreen] React Query cache invalidated for all wallet data');
      },
      onConnect: () => {
        console.log('🔌 [TransferScreen] Real-time notifications connected:', {
          component: 'TransferScreen',
          timestamp: new Date().toISOString(),
          event: 'connected',
          message: 'Successfully connected to Socket.IO notifications server',
          transferScreenState: {
            currentAmount: amount,
            hasAmountError: !!amountError,
            isProcessingTransfer: transferFundsMutation.isPending,
          }
        });
      },
      onError: (error) => {
        console.error('❌ [TransferScreen] Real-time notification error:', {
          component: 'TransferScreen',
          timestamp: new Date().toISOString(),
          event: 'error',
          error: error,
          errorMessage: error?.message || 'Unknown error',
          errorType: typeof error,
          transferScreenState: {
            currentAmount: amount,
            hasAmountError: !!amountError,
            isProcessingTransfer: transferFundsMutation.isPending,
          }
        });
      }
    }
  );
  
  // Handle wallet balance based on access status
  const getWalletBalance = () => {
    if (!hasWalletAccess) {
      return '₦0.00';
    }
    return balanceData?.formattedBalance || '₦0.00';
  };
  
  const walletBalance = getWalletBalance();
  
  // Extract numeric value from balance for comparison
  const walletBalanceNumeric = hasWalletAccess ? (balanceData?.balance || 0) : 0;

  // Use only extracted/resolved data - no fallback values
  const recipientName = extractedAccountHolderName || '';
  const accountNumber = extractedAccountNumber || '';
  const bankName = extractedBankName || '';

  // Validate required transfer data
  useEffect(() => {
    if (!accountNumber || !bankName) {
      console.error('❌ Missing required transfer data:', { accountNumber, bankName, recipientName });
      Alert.alert(
        'Missing Transfer Data',
        'Required account information is missing. Please scan the payment details again.',
        [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]
      );
      return;
    }
  }, [accountNumber, bankName, recipientName]);

  useEffect(() => {
    // If we have an extracted amount, format it properly
    if (extractedAmount && extractedAmount !== '0') {
      const cleanAmount = extractedAmount.replace(/[^\d.]/g, '');
      if (cleanAmount) {
        setAmount(cleanAmount);
      }
    }
  }, [extractedAmount]);

  const handleBackPress = () => {
    router.back();
  };

  const handleAmountChange = (text: string) => {
    // Remove any non-numeric characters except decimal point
    const numericValue = text.replace(/[^\d.]/g, '');
    
    // Format with commas for thousands
    const parts = numericValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formattedValue = parts.join('.');
    
    // Check if amount exceeds balance
    const cleanAmount = numericValue.replace(/,/g, '');
    const enteredAmount = parseFloat(cleanAmount) || 0;
    
    if (enteredAmount > walletBalanceNumeric) {
      setAmountError('Amount cannot exceed wallet balance');
    } else {
      setAmountError(null);
    }
    
    setAmount(formattedValue);
    setSelectedPill(null);
  };

  const handlePillPress = (pillAmount: string) => {
    // Don't allow pill selection during processing
    if (transferFundsMutation.isPending) return;
    
    setSelectedPill(pillAmount);
    // Remove N and keep commas for display
    const numericAmount = pillAmount.replace('N', '');
    
    // Check if pill amount exceeds balance
    const cleanAmount = numericAmount.replace(/,/g, '');
    const enteredAmount = parseFloat(cleanAmount) || 0;
    
    if (enteredAmount > walletBalanceNumeric) {
      setAmountError('Amount cannot exceed wallet balance');
    } else {
      setAmountError(null);
    }
    
    setAmount(numericAmount);
  };

  const formatAmount = (value: string) => {
    if (!value) return '0';
    // Remove existing commas first
    const cleanValue = value.replace(/,/g, '');
    const num = parseFloat(cleanValue);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  const handleTransferPress = () => {
    // Check if user has wallet access first
    if (!hasWalletAccess) {
      Alert.alert(
        'Wallet Access Required',
        statusMessage,
        [
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }

    // Validate amount
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setAmountError('Please enter a valid amount');
      return;
    }

    const transferAmount = parseFloat(amount);

    // Check if amount exceeds balance
    if (transferAmount > walletBalanceNumeric) {
      setAmountError('Insufficient balance');
      return;
    }

    // Clear any previous errors
    setAmountError(null);

    // Show PIN modal
    setShowPinModal(true);
  };

  const handlePinConfirm = async (pin: string) => {
    try {
      // Calculate transfer amount
      const cleanAmount = amount.replace(/,/g, '');
      const transferAmount = parseFloat(cleanAmount) || 0;
      
      if (transferAmount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount');
        return;
      }

      if (transferAmount > walletBalanceNumeric) {
        Alert.alert('Insufficient Balance', 'Amount cannot exceed your wallet balance');
        return;
      }

      console.log('🚀 Initiating transfer with:', {
        amount: transferAmount,
        accountNumber,
        bankName,
        accountName: recipientName,
        pin
      });

      // Execute transfer using React Query mutation
      const transferResult = await transferFundsMutation.mutateAsync({
        amount: transferAmount,
        accountNumber,
        bankName,
        accountName: recipientName,
        description: `Transfer to ${recipientName}`,
        pin
      });

      console.log('✅ Transfer successful:', transferResult);

             // Close PIN modal
       setShowPinModal(false);
       
       // Navigate to success screen with transfer details
       router.push({
         pathname: '/transfer-success',
         params: {
           amount: transferAmount.toLocaleString(),
           recipientName: transferResult.recipientName,
           reference: transferResult.reference,
           newBalance: transferResult.newBalance.toLocaleString(),
         }
       });
      
    } catch (error: any) {
      console.error('❌ Transfer failed:', error);
      
      // Close PIN modal
      setShowPinModal(false);
      
      // Show appropriate error message
      let errorMessage = 'Transfer failed. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('PIN')) {
          errorMessage = 'Invalid PIN. Please check and try again.';
        } else if (error.message.includes('balance') || error.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance for this transfer.';
        } else if (error.message.includes('account')) {
          errorMessage = 'Invalid account details. Please verify and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Transfer Failed', errorMessage, [
        { text: 'OK' }
      ]);
    }
  };

  const handlePinModalClose = () => {
    setShowPinModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transfer</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Recipient Detail Card */}
          <RecipientDetailCard
            name={recipientName}
            accountNumber={accountNumber}
            bankName={bankName}
          />

          {/* Amount Input */}
          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <View style={styles.amountInputContainer}>
                <Text style={styles.amountPrefix}>N</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="rgba(245, 200, 66, 0.5)"
                  autoFocus={true}
                  selectionColor="#F5C842"
                  editable={!transferFundsMutation.isPending}
                />
              </View>
              <View style={styles.balanceContainer}>
                {isBalanceLoading ? (
                  <Text style={styles.balanceText}>Loading...</Text>
                ) : (
                  <View style={styles.balanceAmountContainer}>
                    {(() => {
                      // Split balance into naira and kobo parts for smaller kobo text
                      const balanceText = walletBalance;
                      const decimalIndex = balanceText.indexOf('.');
                      
                      if (decimalIndex === -1) {
                        // No decimal point, just show the full amount
                        return <Text style={styles.balanceText}>{`Bal: ${balanceText}`}</Text>;
                      }
                      
                      const nairapart = balanceText.substring(0, decimalIndex);
                      const kobopart = balanceText.substring(decimalIndex);
                      
                      return (
                        <>
                          <Text style={styles.balanceText}>{`Bal: ${nairapart}`}</Text>
                          <Text style={styles.balanceKoboText}>{kobopart}</Text>
                        </>
                      );
                    })()}
                  </View>
                )}
                {/* Real-time status indicator */}
                {hasWalletAccess && (
                  <View style={[styles.statusIndicator, { 
                    backgroundColor: isNotificationConnected ? '#10B981' : 'rgba(255, 255, 255, 0.3)' 
                  }]} />
                )}
              </View>
            </View>
            
            {/* Show error if amount exceeds balance */}
            {amountError && (
              <Text style={styles.errorText}>{amountError}</Text>
            )}
            
            {/* Show pre-filled amount indicator */}
            {extractedAmount && extractedAmount !== '0' && (
              <Text style={styles.prefilledText}>
                Amount extracted from image: N{formatAmount(extractedAmount)}
              </Text>
            )}
          </View>

          {/* Amount Pills */}
          <View style={styles.pillsContainer}>
            {predefinedAmounts.map((pillAmount) => (
              <AmountPill
                key={pillAmount}
                amount={pillAmount}
                isSelected={selectedPill === pillAmount}
                onPress={() => handlePillPress(pillAmount)}
                style={styles.pill}
              />
            ))}
          </View>
        </View>

        {/* Pay Button */}
        <View style={styles.payButtonContainer}>
          <Button
            title={transferFundsMutation.isPending ? "Processing..." : "Pay"}
            onPress={handleTransferPress}
            disabled={!amount || amount === '0' || !!amountError || transferFundsMutation.isPending || isBalanceLoading}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>

      {/* Transaction PIN Modal */}
      <TransactionPinModal
        visible={showPinModal}
        onClose={handlePinModalClose}
        onConfirm={handlePinConfirm}
        recipientName={recipientName}
        accountNumber={accountNumber}
        bankName={bankName}
        amount={formatAmount(amount)}
        fee="10.00"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  extractionBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  extractionText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: '#10B981',
  },
  amountSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  amountPrefix: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.regular,
    color: '#FFE66C',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFE66C',
    flex: 1,
    padding: 0,
    margin: 0,
    minHeight: 40,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  balanceKoboText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    color: '#FF6B6B',
    marginTop: 8,
  },
  prefilledText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(245, 200, 66, 0.7)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  pillsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 40,
  },
  pill: {
    flex: 1,
  },
  payButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  }
});