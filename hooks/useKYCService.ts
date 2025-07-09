import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { verifyBVN, uploadSelfie, getKYCStatus, getNextStepFromStatus, getScreenForStatus } from '@/services/KYCService';

// Query Keys
export const KYC_QUERY_KEYS = {
  status: ['kyc', 'status'] as const,
  bvnVerification: ['kyc', 'bvn'] as const,
  selfieUpload: ['kyc', 'selfie'] as const,
} as const;

// Hook for checking KYC status
export const useKYCStatus = () => {
  return useQuery({
    queryKey: KYC_QUERY_KEYS.status,
    queryFn: getKYCStatus,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds for status updates
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for BVN verification
export const useVerifyBVN = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyBVN,
    onSuccess: (data) => {
      // Invalidate and refetch KYC status
      queryClient.invalidateQueries({ queryKey: KYC_QUERY_KEYS.status });
      
      if (data.success) {
        // Show success message
        Alert.alert('Success', data.message);
        
        // Navigate based on status
        if (data.kycStatus === 'IN_PROGRESS') {
          router.push('/(kyc)/bvn-loader');
        } else if (data.kycStatus === 'VERIFIED') {
          router.push('/(kyc)/bridge');
        }
      } else {
        // Show error message
        Alert.alert('Verification Failed', data.message);
      }
    },
    onError: (error: Error) => {
      console.error('BVN Verification Error:', error);
      Alert.alert(
        'Error', 
        error.message || 'BVN verification failed. Please try again.'
      );
    },
  });
};

// Hook for selfie upload
export const useUploadSelfie = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadSelfie,
    onSuccess: (data) => {
      // Invalidate and refetch KYC status
      queryClient.invalidateQueries({ queryKey: KYC_QUERY_KEYS.status });
      
      if (data.success) {
        // Show success message
        Alert.alert('Success', data.message);
        
        // Navigate based on status
        if (data.kycStatus === 'VERIFIED' && data.walletCreated) {
          // KYC completed, wallet created - go to success screen or main app
          router.replace('/(kyc)/bridge'); // Bridge will show completion
        } else if (data.kycStatus === 'UNDER_REVIEW') {
          // Under admin review
          router.replace('/(kyc)/bridge');
        }
      } else {
        // Show error message (user-friendly)
        Alert.alert('Upload Failed', data.message);
      }
    },
    onError: (error: Error) => {
      console.error('Selfie Upload Error:', error);
      Alert.alert(
        'Upload Error', 
        error.message || 'Selfie upload failed. Please try again.'
      );
    },
  });
};

// Hook for navigation based on KYC status
export const useKYCNavigation = () => {
  const { data: kycStatus, isLoading } = useKYCStatus();

  const navigateToCorrectScreen = () => {
    if (!kycStatus || isLoading) return;

    const targetScreen = getScreenForStatus(kycStatus.kycStatus);
    router.replace(targetScreen);
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
    return kycStatus?.bvnVerified && kycStatus?.kycStatus === 'IN_PROGRESS';
  };

  const isKYCComplete = () => {
    return kycStatus?.kycStatus === 'VERIFIED' && kycStatus?.isVerified;
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
  useVerifyBVN,
  useUploadSelfie,
  useKYCNavigation,
  useKYCStep,
  useKYCErrorHandler,
}; 