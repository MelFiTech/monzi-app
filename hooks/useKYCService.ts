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

// Hook for checking KYC status with proper caching
export const useKYCStatus = () => {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: KYC_QUERY_KEYS.status,
    queryFn: async () => {
      console.log('🔍 Fetching KYC status...');
      const status = await getKYCStatus();
      console.log('📊 Current KYC Status:', {
        kycStatus: status.kycStatus,
        bvnVerified: status.bvnVerified,
        selfieVerified: status.selfieVerified,
        isVerified: status.isVerified,
        nextStep: status.nextStep,
        message: status.message
      });
      return status;
    },
    // Only enable when user is authenticated
    enabled: isAuthenticated,
    
    // Cache for 15 minutes - KYC status rarely changes unless user performs actions
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    
    // Disable automatic refetching - only fetch when explicitly needed
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Still refetch on mount for fresh data on app start
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchInterval: false, // Disable automatic polling - rely on cache invalidation
    refetchIntervalInBackground: false,
    
    // Retry configuration
    retry: 2, // Reduced retries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    
    // Network mode - only when online
    networkMode: 'online',
  });
};

// Hook to manually refresh KYC status when needed
export const useRefreshKYCStatus = () => {
  const queryClient = useQueryClient();

  const refreshKYCStatus = async () => {
    console.log('🔄 Manually refreshing KYC status...');
    await queryClient.invalidateQueries({ queryKey: KYC_QUERY_KEYS.status });
  };

  const setKYCStatusCache = (data: KYCStatusResponse) => {
    console.log('💾 Setting KYC status cache with:', data.kycStatus);
    queryClient.setQueryData(KYC_QUERY_KEYS.status, data);
  };

  return {
    refreshKYCStatus,
    setKYCStatusCache,
  };
};

// Hook for BVN verification
export const useVerifyBVN = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyBVN,
    onSuccess: (data) => {
      console.log('🎉 BVN Verification Success:', data);
      
      // Smart cache update instead of invalidation
      if (data.success && data.kycStatus) {
        console.log('💾 Updating KYC cache with BVN verification result');
        queryClient.setQueryData(KYC_QUERY_KEYS.status, (oldData: KYCStatusResponse | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              bvnVerified: true,
              kycStatus: data.kycStatus,
              message: data.message || oldData.message,
              nextStep: data.kycStatus === 'IN_PROGRESS' ? 'selfie_upload' as const : oldData.nextStep,
            };
          }
          // If no old data, create minimal status from response
          return {
            kycStatus: data.kycStatus,
            bvnVerified: true,
            selfieVerified: false,
            isVerified: false,
            message: data.message || 'BVN verified successfully',
            nextStep: data.kycStatus === 'IN_PROGRESS' ? 'selfie_upload' as const : null,
          };
        });
      } else {
        // Only invalidate if we don't have success data to update cache
        queryClient.invalidateQueries({ queryKey: KYC_QUERY_KEYS.status });
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
        console.log('✅ BVN already verified, treating as success and updating cache');
        
        // Update cache to mark BVN as verified
        queryClient.setQueryData(KYC_QUERY_KEYS.status, (oldData: KYCStatusResponse | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              bvnVerified: true,
              kycStatus: 'IN_PROGRESS', // BVN done, selfie needed
              message: 'BVN verified successfully',
            };
          }
          // If no old data, create minimal status
          return {
            kycStatus: 'IN_PROGRESS' as const,
            bvnVerified: true,
            selfieVerified: false,
            isVerified: false,
            message: 'BVN verified successfully',
            nextStep: 'selfie_upload' as const,
          };
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

// Hook for selfie upload
export const useUploadSelfie = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadSelfie,
    onSuccess: (data) => {
      console.log('🎉 Selfie Upload Success:', data);
      
      // Smart cache update instead of invalidation
      if (data.success && data.kycStatus) {
        console.log('💾 Updating KYC cache with selfie upload result');
        queryClient.setQueryData(KYC_QUERY_KEYS.status, (oldData: KYCStatusResponse | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              selfieVerified: true,
              kycStatus: data.kycStatus,
              message: data.message || oldData.message,
              isVerified: data.kycStatus === 'VERIFIED' || data.kycStatus === 'APPROVED',
            };
          }
          return oldData;
        });
      } else {
        // Only invalidate if we don't have success data to update cache
        queryClient.invalidateQueries({ queryKey: KYC_QUERY_KEYS.status });
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
        
        // Check if it requires contact support
        if (data.error === 'AI_VERIFICATION_FAILED' || 
            (data.message && data.message.toLowerCase().includes('contact support'))) {
          console.log('🚨 Selfie upload requires contact support, setting flag and routing to bridge');
          // Set flag for bridge screen to show contact support
          AsyncStorage.setItem('kyc_requires_support', 'true');
          ToastService.error('Contact support');
        } else {
          ToastService.error('Upload failed');
        }
        
        // Always navigate to bridge regardless of error type
        // Bridge will show appropriate button based on KYC status or support flag
        console.log('➡️ Navigating to bridge after selfie upload failure');
        router.push('/(kyc)/bridge' as never);
      }
    },
    onError: (error: Error) => {
      console.error('🚨 Selfie Upload Error:', error);
      
      // Check if it's a network error
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        ToastService.error('Connection failed');
      } else {
        ToastService.error('Upload failed');
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