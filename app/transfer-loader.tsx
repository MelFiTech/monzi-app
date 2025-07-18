import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { useTransferFunds } from '@/hooks/useWalletService';
import CircularLoader from '@/components/common/CircularLoader';

export default function TransferLoaderScreen() {
  const params = useLocalSearchParams();
  const transferFundsMutation = useTransferFunds();
  const [authError, setAuthError] = useState<string | null>(null);

  // Extract transfer details from params
  const amount = parseFloat(params.amount as string) || 0;
  const accountNumber = params.accountNumber as string || '';
  const bankName = params.bankName as string || '';
  const accountName = params.accountName as string || '';
  const pin = params.pin as string || '';

  useEffect(() => {
    if (amount && accountNumber && bankName && accountName && pin) {
      initiateTransfer();
    }
  }, []);

  const initiateTransfer = async () => {
    try {
      console.log('🚀 [TransferLoader] Initiating transfer:', {
        amount,
        accountNumber,
        bankName,
        accountName,
        pin: '****'
      });

      // Debug: Log exact transfer parameters being sent
      const transferParams = {
        amount,
        accountNumber,
        bankName,
        accountName,
        description: `Transfer to ${accountName}`,
        pin
      };
      
      console.log('📤 [TransferLoader] Transfer parameters:', {
        ...transferParams,
        pin: '****'  // Don't log actual PIN
      });

      const transferResult = await transferFundsMutation.mutateAsync(transferParams);

      console.log('✅ [TransferLoader] Transfer successful:', transferResult);

      // Navigate to success screen
      router.replace({
        pathname: '/transfer-success',
        params: {
          amount: amount.toLocaleString(),
          recipientName: transferResult.recipientName,
          reference: transferResult.reference,
          newBalance: transferResult.newBalance.toLocaleString(),
        }
      });
      
    } catch (error: any) {
      console.error('❌ [TransferLoader] Transfer failed:', error);
      
      // Handle specific error cases
      if (error?.message?.includes('PIN') || error?.message?.includes('pin')) {
        // PIN error - go back to PIN modal
        router.replace({
          pathname: '/transfer',
          params: {
            ...params,
            pinError: 'Invalid PIN. Please try again.'
          }
        });
      } else if (error?.message?.includes('balance') || error?.message?.includes('insufficient')) {
        // Balance error
        router.replace({
          pathname: '/transfer',
          params: {
            ...params,
            transferError: 'Insufficient balance for this transfer.'
          }
        });
      } else {
        // General error
        router.replace({
          pathname: '/transfer',
          params: {
            ...params,
            transferError: error?.message || 'Transfer failed. Please try again.'
          }
        });
      }
    }
  };

  const handleCancel = () => {
    router.replace('/transfer');
  };

  return (
    <SafeAreaView style={styles.container}> 
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <CircularLoader 
          size={70}
          strokeWidth={6}
          color="#FFE66C"
          backgroundColor="rgba(255, 255, 255, 0.1)"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 