import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyBVN, uploadSelfie, getKYCStatus, getNextStepFromStatus, getScreenForStatus } from '@/services/KYCService';
import type { KYCStatusResponse } from '@/services/KYCService';
import ToastService from '@/services/ToastService';
import { useAuth } from '@/providers/AuthProvider';

// Query Keys
export const KYC_QUERY_KEYS = {
  status: ['kyc', 'status'] as const,
  bvnVerification: ['kyc', 'bvn'] as const,
  selfieUpload: ['kyc', 'selfie'] as const,
} as const;

// Hook for checking KYC status with smart long-term caching
export const useKYCStatus = () => {
  const { isAuthenticated, authToken, user } = useAuth();

  return useQuery({
    queryKey: [...KYC_QUERY_KEYS.status, user?.id], // Include user ID for cache isolation
    queryFn: async () => {
      console.log('🔍 Fetching fresh KYC status from API...');
      const status = await getKYCStatus();
      console.log('📊 Fresh KYC Status from API:', {
        kycStatus: status.kycStatus,
        bvnVerified: status.bvnVerified,
        selfieVerified: status.selfieVerified,
        isVerified: status.isVerified,
        nextStep: status.nextStep,
        message: status.message
      });
      return status;
    },
    // Only enable when user is authenticated AND has auth token
    enabled: isAuthenticated && !!authToken,

    // 🚀 NO CACHING - Always fetch fresh KYC status
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't keep in cache

    // Always refetch - no caching
    refetchOnWindowFocus: true, // Refetch when app comes into focus
    refetchOnMount: true, // Always refetch on mount
    refetchOnReconnect: true, // Refetch when network reconnects

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),

    // Network mode - only when online
    networkMode: 'online',
  });
};

// Hook to manually refresh KYC status when needed
export const useRefreshKYCStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const refreshKYCStatus = async () => {
    console.log('🔄 [KYC Cache] Manually refreshing KYC status...');
    await queryClient.invalidateQueries({ queryKey: [...KYC_QUERY_KEYS.status, user?.id] });
  };

  const setKYCStatusCache = (data: KYCStatusResponse) => {
    console.log('💾 [KYC Cache] Setting KYC status cache with:', data.kycStatus);
    queryClient.setQueryData([...KYC_QUERY_KEYS.status, user?.id], data);
  };

  // Smart cache update - only update specific fields that changed
  const updateKYCStatusCache = (updates: Partial<KYCStatusResponse>) => {
    console.log('🔄 [KYC Cache] Smart cache update:', updates);
    queryClient.setQueryData([...KYC_QUERY_KEYS.status, user?.id], (oldData: KYCStatusResponse | undefined) => {
      if (oldData) {
        const newData = { ...oldData, ...updates };
        console.log('💾 [KYC Cache] Updated cache from:', oldData.kycStatus, 'to:', newData.kycStatus);
        return newData;
      }
      return oldData;
    });
  };

  // Clear cache on logout
  const clearKYCCache = () => {
    console.log('🗑️ [KYC Cache] Clearing KYC cache on logout');
    queryClient.removeQueries({ queryKey: KYC_QUERY_KEYS.status });
  };

  return {
    refreshKYCStatus,
    setKYCStatusCache,
    updateKYCStatusCache,
    clearKYCCache,
  };
};

// Hook for BVN verification with smart caching
export const useVerifyBVN = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: verifyBVN,
    onSuccess: (data) => {
      console.log('🎉 [KYC Cache] BVN Verification Success:', data);

      // 🚀 SMART CACHE UPDATE - Update cache immediately with new data
      if (data.success && data.kycStatus) {
        console.log('💾 [KYC Cache] Updating KYC cache with BVN verification result');
        queryClient.setQueryData([...KYC_QUERY_KEYS.status, user?.id], (oldData: KYCStatusResponse | undefined) => {
          if (oldData) {
            const updatedData = {
              ...oldData,
              bvnVerified: true,
              kycStatus: data.kycStatus,
              message: data.message || oldData.message,
              nextStep: data.kycStatus === 'IN_PROGRESS' ? 'selfie_upload' as const : oldData.nextStep,
            };
            console.log('💾 [KYC Cache] BVN cache updated:', {
              from: oldData.kycStatus,
              to: updatedData.kycStatus,
              bvnVerified: updatedData.bvnVerified
            });
            return updatedData;
          }
          // If no old data, create minimal status from response
          const newData = {
            kycStatus: data.kycStatus,
            bvnVerified: true,
            selfieVerified: false,
            isVerified: false,
            message: data.message || 'BVN verified successfully',
            nextStep: data.kycStatus === 'IN_PROGRESS' ? 'selfie_upload' as const : null,
          };
          console.log('💾 [KYC Cache] Created new BVN cache:', newData);
          return newData;
        });
      } else {
        // Only invalidate if we don't have success data to update cache
        console.log('⚠️ [KYC Cache] BVN verification failed, invalidating cache');
        queryClient.invalidateQueries({ queryKey: [...KYC_QUERY_KEYS.status, user?.id] });
      }

      if (data.success) {
        // Show success toast
        ToastService.success('BVN verified');

        console.log('🔄 BVN Verification routing based on status:', data.kycStatus);

        // Navigate based on status - follow the intended flow
        if (data.kycStatus === 'IN_PROGRESS') {
          // BVN verified, still need selfie - go to loader then success then bridge
          console.log('➡️ Navigating to BVN loader (IN_PROGRESS)');
          router.push('/(kyc)/bvn-loader' as never);
        } else if (data.kycStatus === 'UNDER_REVIEW') {
          // BVN verified and under review - go directly to bridge for biometric flow
          console.log('➡️ Navigating to bridge (UNDER_REVIEW) - BVN successful, ready for biometrics');
          router.push('/(kyc)/bridge' as never);
        } else if (data.kycStatus === 'VERIFIED' || data.kycStatus === 'APPROVED') {
          // Fully verified/approved (shouldn't happen after just BVN) - go to bridge
          console.log('➡️ Navigating to bridge (VERIFIED/APPROVED)');
          router.push('/(kyc)/bridge' as never);
        } else {
          // Fallback to loader for any other successful response
          console.log('➡️ Navigating to BVN loader (fallback)');
          router.push('/(kyc)/bvn-loader' as never);
        }
      } else {
        // Handle different failure scenarios
        console.error('❌ BVN Verification failed:', data.message, 'Error:', data.error);

        // Check if BVN already exists for another user or needs contact support
        if (data.error === 'BVN_ALREADY_EXISTS' ||
          (data.message && data.message.toLowerCase().includes('contact support'))) {
          console.log('🚨 BVN requires contact support, setting flag and routing to bridge');
          // Set flag for bridge screen to show contact support
          AsyncStorage.setItem('kyc_requires_support', 'true');
          ToastService.error('Contact support');
          router.push('/(kyc)/bridge' as never);
        }
        // Other generic failures
        else {
          console.log('❌ General BVN failure, showing error toast');
          ToastService.error('BVN failed');
        }
      }
    },
    onError: (error: Error) => {
      console.error('🚨 BVN Verification Error:', error);

      // Check if BVN is already verified - treat as success
      if (error.message.includes('BVN already verified') || error.message.includes('BVN_ALREADY_VERIFIED')) {
        console.log('✅ [KYC Cache] BVN already verified, treating as success and updating cache');

        // Update cache to mark BVN as verified
        queryClient.setQueryData([...KYC_QUERY_KEYS.status, user?.id], (oldData: KYCStatusResponse | undefined) => {
          if (oldData) {
            const updatedData = {
              ...oldData,
              bvnVerified: true,
              kycStatus: 'IN_PROGRESS', // BVN done, selfie needed
              message: 'BVN verified successfully',
            };
            console.log('💾 [KYC Cache] BVN already verified cache update:', updatedData);
            return updatedData;
          }
          // If no old data, create minimal status
          const newData = {
            kycStatus: 'IN_PROGRESS' as const,
            bvnVerified: true,
            selfieVerified: false,
            isVerified: false,
            message: 'BVN verified successfully',
            nextStep: 'selfie_upload' as const,
          };
          console.log('💾 [KYC Cache] Created new BVN already verified cache:', newData);
          return newData;
        });

        ToastService.success('BVN verified');
        console.log('➡️ Navigating to bridge for biometrics (BVN already verified)');
        router.push('/(kyc)/bridge' as never);
        return;
      }

      // Check if it's a network error
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        ToastService.error('Connection failed');
      } else {
        ToastService.error('BVN failed');
      }
    },
  });
};

// Hook for selfie upload with smart caching
export const useUploadSelfie = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: uploadSelfie,
    onSuccess: (data) => {
      console.log('🎉 [KYC Cache] Selfie Upload Success:', data);

      // 🚀 SMART CACHE UPDATE - Update cache immediately with new data
      if (data.success && data.kycStatus) {
        console.log('💾 [KYC Cache] Updating KYC cache with selfie upload result');
        queryClient.setQueryData([...KYC_QUERY_KEYS.status, user?.id], (oldData: KYCStatusResponse | undefined) => {
          if (oldData) {
            const updatedData = {
              ...oldData,
              selfieVerified: true,
              kycStatus: data.kycStatus,
              message: data.message || oldData.message,
              isVerified: data.kycStatus === 'VERIFIED' || data.kycStatus === 'APPROVED',
            };
            console.log('💾 [KYC Cache] Selfie cache updated:', {
              from: oldData.kycStatus,
              to: updatedData.kycStatus,
              selfieVerified: updatedData.selfieVerified,
              isVerified: updatedData.isVerified
            });
            return updatedData;
          }
          return oldData;
        });
      } else {
        // Only invalidate if we don't have success data to update cache
        console.log('⚠️ [KYC Cache] Selfie upload failed, invalidating cache');
        queryClient.invalidateQueries({ queryKey: [...KYC_QUERY_KEYS.status, user?.id] });
      }

      if (data.success) {
        // Show success toast
        ToastService.success('Verification complete');

        console.log('🔄 Selfie Upload routing based on status:', data.kycStatus);

        // Navigate based on status - all successful uploads go to bridge
        console.log('➡️ Navigating to bridge after successful selfie upload');
        router.push('/(kyc)/bridge' as never);
      } else {
        console.error('❌ Selfie Upload failed:', data.message, 'Error:', data.error);

        // Check if it requires contact support (only for specific errors)
        if (data.error === 'INVALID_DOCUMENT' ||
          data.error === 'DOCUMENT_EXPIRED' ||
          (data.message && data.message.toLowerCase().includes('contact support'))) {
          console.log('🚨 Selfie upload requires contact support, setting flag and routing to bridge');
          // Set flag for bridge screen to show contact support
          AsyncStorage.setItem('kyc_requires_support', 'true');
          ToastService.error('Contact support');
          router.push('/(kyc)/bridge' as never);
        } else {
          // For AI verification failures, allow retry with better guidance
          console.log('⚠️ AI verification failed, allowing retry with better guidance');
          ToastService.error('Verification failed. Please ensure good lighting and try again.');

          // Navigate back to camera with specific error message for retry
          router.push({
            pathname: '/(kyc)/camera',
            params: {
              error: 'Face verification failed. Please ensure:\n• Good lighting\n• Face is clearly visible\n• No shadows or glare\n• Try again'
            }
          });
        }
      }
    },
    onError: (error: Error) => {
      console.error('🚨 Selfie Upload Error:', error);

      // Check if it's a network error
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        ToastService.error('Connection failed. Please check your internet and try again.');
        router.push({
          pathname: '/(kyc)/camera',
          params: {
            error: 'Connection failed. Please check your internet connection and try again.'
          }
        });
      } else {
        ToastService.error('Upload failed. Please try again.');
        router.push({
          pathname: '/(kyc)/camera',
          params: {
            error: 'Upload failed. Please try again with better lighting.'
          }
        });
      }
    },
  });
};

// Hook for navigation based on KYC status
export const useKYCNavigation = () => {
  const { data: kycStatus, isLoading } = useKYCStatus();

  const navigateToCorrectScreen = () => {
    if (!kycStatus || isLoading) return;

    const targetScreen = getScreenForStatus(kycStatus.kycStatus);
    router.replace(targetScreen as any);
  };

  return {
    kycStatus,
    isLoading,
    navigateToCorrectScreen,
  };
};

// Hook for determining current step and what user should do next
export const useKYCStep = () => {
  const { data: kycStatus, isLoading, error } = useKYCStatus();

  const getCurrentStep = () => {
    if (!kycStatus) return 'loading';

    switch (kycStatus.kycStatus) {
      case 'PENDING':
        return 'bvn';
      case 'IN_PROGRESS':
        return 'selfie';
      case 'VERIFIED':
      case 'APPROVED':
        return 'complete';
      case 'REJECTED':
        return 'rejected';
      case 'UNDER_REVIEW':
        return 'review';
      default:
        return 'unknown';
    }
  };

  const canProceedToSelfie = () => {
    const canProceed = kycStatus?.bvnVerified &&
      !kycStatus?.selfieVerified &&
      (kycStatus?.kycStatus === 'IN_PROGRESS' || kycStatus?.kycStatus === 'UNDER_REVIEW');
    console.log('🔍 Can proceed to selfie check:', {
      bvnVerified: kycStatus?.bvnVerified,
      selfieVerified: kycStatus?.selfieVerified,
      kycStatus: kycStatus?.kycStatus,
      canProceed
    });
    return canProceed;
  };

  const isKYCComplete = () => {
    return (kycStatus?.kycStatus === 'VERIFIED' || kycStatus?.kycStatus === 'APPROVED') &&
      kycStatus?.isVerified &&
      kycStatus?.bvnVerified &&
      kycStatus?.selfieVerified;
  };

  const getStatusMessage = () => {
    return kycStatus?.message || getNextStepFromStatus(kycStatus?.kycStatus || 'PENDING');
  };

  return {
    kycStatus,
    isLoading,
    error,
    currentStep: getCurrentStep(),
    canProceedToSelfie: canProceedToSelfie(),
    isKYCComplete: isKYCComplete(),
    statusMessage: getStatusMessage(),
  };
};

// Hook for handling KYC errors consistently
export const useKYCErrorHandler = () => {
  const handleError = (error: Error, defaultMessage: string = 'An error occurred') => {
    console.error('KYC Error:', error);

    // Check for specific error types
    if (error.message.includes('Authentication token expired')) {
      Alert.alert(
        'Session Expired',
        'Please log in again to continue.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
      return;
    }

    if (error.message.includes('Network')) {
      Alert.alert(
        'Network Error',
        'Please check your internet connection and try again.'
      );
      return;
    }

    // Default error handling
    Alert.alert('Error', error.message || defaultMessage);
  };

  return { handleError };
};

export default {
  useKYCStatus,
  useRefreshKYCStatus,
  useVerifyBVN,
  useUploadSelfie,
  useKYCNavigation,
  useKYCStep,
  useKYCErrorHandler,
}; 