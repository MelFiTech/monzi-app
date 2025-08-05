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
import { useTransferFunds, usePinStatus } from '@/hooks/useWalletService';
import { useGetCurrentLocation } from '@/hooks/useLocationService';
import CircularLoader from '@/components/common/CircularLoader';
import AccountService from '@/services/AccountService';

export default function TransferLoaderScreen() {
  const params = useLocalSearchParams();
  const transferFundsMutation = useTransferFunds();
  const getLocationMutation = useGetCurrentLocation();
  const { data: pinStatus, isLoading: isPinStatusLoading } = usePinStatus();
  const [authError, setAuthError] = useState<string | null>(null);

  // Extract transfer details from params
  const amount = parseFloat(params.amount as string) || 0;
  const accountNumber = params.accountNumber as string || '';
  const bankName = params.bankName as string || '';
  const accountName = params.accountName as string || '';
  const pin = params.pin as string || '';
  const transferSource = params.transferSource as string || ''; // 'image_extraction', 'suggestion_modal', 'manual_entry'

  useEffect(() => {
    if (amount && accountNumber && bankName && accountName && pin) {
      initiateTransfer();
    }
  }, []);

  const initiateTransfer = async () => {
    // Set up transfer timeout (30 seconds)
    const transferTimeout = setTimeout(() => {
      console.error('❌ [TransferLoader] Transfer timeout after 30 seconds');
      router.replace({
        pathname: '/transfer',
        params: {
          ...params,
          transferError: 'Transfer timeout. Please try again.'
        }
      });
    }, 30000);

    try {
      console.log('🚀 [TransferLoader] Initiating transfer:', {
        amount,
        accountNumber,
        bankName,
        accountName,
        pin: '****'
      });

      // Check PIN status before proceeding
      if (pinStatus && !pinStatus.hasPinSet) {
        clearTimeout(transferTimeout);
        console.error('❌ [TransferLoader] No PIN set - cannot proceed with transfer');
        router.replace({
          pathname: '/transfer',
          params: {
            ...params,
            transferError: 'Transaction PIN is required. Please set a PIN first.'
          }
        });
        return;
      }

      // Check network connectivity before proceeding
      console.log('🔍 [TransferLoader] Checking network connectivity...');
      const networkTest = await AccountService.testNetworkConnectivity();
      
      if (!networkTest.isReachable) {
        clearTimeout(transferTimeout);
        console.error('❌ [TransferLoader] Network connectivity test failed:', networkTest.error);
        router.replace({
          pathname: '/transfer',
          params: {
            ...params,
            transferError: 'Network connectivity issue. Please check your connection and try again.'
          }
        });
        return;
      }
      
      console.log('✅ [TransferLoader] Network connectivity confirmed, latency:', networkTest.latency, 'ms');

      // Capture current location for business payment tracking (with timeout)
      let locationData: { latitude: number; longitude: number } | null = null;
      try {
        // Set up location timeout (5 seconds)
        const locationTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), 5000)
        );
        
        locationData = await Promise.race([
          getLocationMutation.mutateAsync(),
          locationTimeout
        ]);
        console.log('📍 [TransferLoader] Location captured:', locationData);
      } catch (locationError) {
        console.log('⚠️ [TransferLoader] Location capture failed or timed out, continuing without location:', locationError);
        // Continue without location - it's optional
      }

      // Debug: Log exact transfer parameters being sent
      const transferParams: any = {
        amount,
        accountNumber,
        bankName,
        accountName,
        description: `Transfer to ${accountName}`,
        pin,
      };

      // Include location data if available
      if (locationData) {
        transferParams.locationName = accountName; // Use recipient name as location name
        transferParams.locationLatitude = locationData.latitude;
        transferParams.locationLongitude = locationData.longitude;
      }
      
      console.log('📤 [TransferLoader] Transfer parameters:', {
        ...transferParams,
        pin: '****'  // Don't log actual PIN
      });

      const transferResult = await transferFundsMutation.mutateAsync(transferParams);

      // Clear timeout since transfer completed
      clearTimeout(transferTimeout);

      console.log('✅ [TransferLoader] Transfer successful:', transferResult);

      // Navigate to success screen
      router.replace({
        pathname: '/transfer-success',
        params: {
          amount: amount.toLocaleString(),
          recipientName: transferResult.recipientName,
          reference: transferResult.reference,
          newBalance: transferResult.newBalance.toLocaleString(),
          transactionId: transferResult.transactionId || '', // Pass transaction ID for tagging
          transferSource: transferSource, // Pass transfer source for toggle visibility
        }
      });
      
    } catch (error: any) {
      // Clear timeout since transfer failed
      clearTimeout(transferTimeout);
      
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
      } else if (error?.message?.includes('timeout') || error?.message?.includes('Network request failed')) {
        // Network/timeout error
        router.replace({
          pathname: '/transfer',
          params: {
            ...params,
            transferError: 'Network timeout. Please check your connection and try again.'
          }
        });
      } else if (error?.message?.includes('authentication') || error?.message?.includes('token') || error?.statusCode === 401) {
        // Authentication error - redirect to login
        console.error('🔐 Authentication error during transfer:', error);
        router.replace({
          pathname: '/login',
          params: {
            authError: 'Your session has expired. Please log in again.'
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