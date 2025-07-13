import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/providers/AuthProvider';
import { useKYCStatus } from '@/hooks/useKYCService';
import { useWalletDetails, useWalletBalance, usePinStatus } from '@/hooks/useWalletService';
import { WalletService } from '@/services';
import ToastService from '@/services/ToastService';

interface BackendChecksProps {
  isFreshRegistration: boolean;
  showVerificationModal: boolean;
  setIsFreshRegistration: (value: boolean) => void;
  setIsWalletActivationMode: (value: boolean) => void;
  setIsPendingVerification: (value: boolean) => void;
  setShowVerificationModal: (value: boolean) => void;
  setShowSetPinModal: (value: boolean) => void;
  setAreAllChecksComplete: (value: boolean) => void;
  setShowPulsatingGlow: (value: boolean) => void;
}

export function useBackendChecks(props: BackendChecksProps) {
  const { isAuthenticated, user } = useAuth();
  const { data: kycStatus, error: kycError, isLoading: kycLoading, isError: kycIsError } = useKYCStatus();
  const { data: walletDetails, error: walletDetailsError, isLoading: walletDetailsLoading, isError: walletDetailsIsError } = useWalletDetails();
  const { data: walletBalance, error: walletBalanceError, isLoading: walletBalanceLoading, isError: walletBalanceIsError } = useWalletBalance();
  const { data: pinStatus } = usePinStatus();

  // Debug authentication state
  useEffect(() => {
    console.log('🔐 Authentication Debug:', {
      isAuthenticated,
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id
    });
  }, [isAuthenticated, user]);

  // Debug KYC status fetch
  useEffect(() => {
    console.log('📋 KYC Status Fetch Debug:', {
      isAuthenticated,
      kycStatus,
      kycError: kycError?.message,
      kycLoading,
      kycIsError,
      hasKycData: !!kycStatus
    });
  }, [isAuthenticated, kycStatus, kycError, kycLoading, kycIsError]);

  // BACKEND CHECKS COMPLETION - Check if all systems are ready
  useEffect(() => {
    if (!isAuthenticated) {
      props.setShowPulsatingGlow(true);
      props.setAreAllChecksComplete(false);
      return;
    }

    const kycCheckComplete = !kycLoading && (kycStatus || kycIsError);
    const walletDetailsComplete = !walletDetailsLoading && (walletDetails || walletDetailsError);
    const walletBalanceComplete = !walletBalanceLoading && (walletBalance || walletBalanceError);
    
    const allChecksComplete = kycCheckComplete && walletDetailsComplete && walletBalanceComplete;

    console.log('🔍 Backend Checks Status:', {
      isAuthenticated,
      kycCheckComplete,
      walletDetailsComplete,
      walletBalanceComplete,
      allChecksComplete,
      showPulsatingGlow: props.showPulsatingGlow
    });

    if (allChecksComplete) {
      const kycSuccessful = kycStatus && !kycIsError;
      const hasSuccessfulWalletData = walletDetails && walletBalance && !walletDetailsError && !walletBalanceError;
      
      if (props.isFreshRegistration) {
        console.log('🆕 Fresh registration - showing verification modal');
        props.setShowPulsatingGlow(false);
        props.setAreAllChecksComplete(true);
        props.setShowVerificationModal(true);
        return;
      }

      if (kycSuccessful && hasSuccessfulWalletData) {
        console.log('✅ All checks successful - showing camera interface');
        props.setShowPulsatingGlow(false);
        props.setAreAllChecksComplete(true);
        return;
      }

      if (kycSuccessful) {
        const statusData = kycStatus as any;
        const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                               statusData?.isVerified && 
                               statusData?.bvnVerified && 
                               statusData?.selfieVerified;

        if (isFullyVerified && (walletDetailsError || walletBalanceError)) {
          console.log('💳 User verified, needs wallet activation');
          props.setShowPulsatingGlow(false);
          props.setAreAllChecksComplete(true);
          props.setIsWalletActivationMode(true);
          props.setShowVerificationModal(true);
          return;
        }
      }

      console.log('⚠️ Some checks failed or user needs verification');
      props.setShowPulsatingGlow(false);
      props.setAreAllChecksComplete(true);
      props.setShowVerificationModal(true);
    } else {
      console.log('⏳ Backend checks still running - showing pulsating glow');
      props.setShowPulsatingGlow(true);
      props.setAreAllChecksComplete(false);
    }
  }, [
    isAuthenticated, 
    kycStatus, kycLoading, kycIsError,
    walletDetails, walletDetailsLoading, walletDetailsError,
    walletBalance, walletBalanceLoading, walletBalanceError,
    props.isFreshRegistration, props.showVerificationModal
  ]);

  // COMPREHENSIVE FLOW SUMMARY for debugging
  useEffect(() => {
    console.log('🌊 COMPREHENSIVE FLOW SUMMARY:', {
      isAuthenticated,
      hasUser: !!user,
      isFreshRegistration: props.isFreshRegistration,
      kycStatus: kycStatus ? (kycStatus as any)?.kycStatus : 'NO_DATA',
      kycLoading,
      kycIsError,
      kycError: kycError?.message,
      showVerificationModal: props.showVerificationModal,
      'Flow Decision': 
        props.isFreshRegistration ? 'FRESH_REGISTRATION_PRIORITY' :
        kycIsError ? 'KYC_API_ERROR_FALLBACK' :
        kycLoading ? 'WAITING_FOR_KYC' :
        !kycStatus ? 'NO_KYC_DATA_FALLBACK' :
        (kycStatus as any)?.kycStatus === 'APPROVED' ? 'APPROVED_USER' :
        (kycStatus as any)?.kycStatus === 'VERIFIED' ? 'VERIFIED_USER' :
        'UNKNOWN_STATUS'
    });
  }, [
    isAuthenticated, user, props.isFreshRegistration, 
    kycStatus, kycLoading, kycIsError, kycError,
    props.showVerificationModal
  ]);

  // Debug wallet access conditions
  useEffect(() => {
    if (kycStatus) {
      const statusData = kycStatus as any;
      const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                             statusData?.isVerified && 
                             statusData?.bvnVerified && 
                             statusData?.selfieVerified;
      
      console.log('🔐 Wallet Access Debug:', {
        kycStatus: statusData?.kycStatus,
        isVerified: statusData?.isVerified,
        bvnVerified: statusData?.bvnVerified,
        selfieVerified: statusData?.selfieVerified,
        isFullyVerified,
        shouldHaveWalletAccess: isFullyVerified
      });
    }
  }, [kycStatus]);

  // Manual wallet endpoint test function
  const testWalletEndpoints = async () => {
    try {
      console.log('🧪 Testing wallet endpoints manually...');
      
      const { Config } = await import('@/constants/config');
      const baseUrl = Config.API.getBaseUrl();
      console.log('🔧 API Configuration Test:', {
        baseUrl,
        environment: Config.getCurrentEnvironment(),
        isDevelopment: Config.isDevelopment()
      });
      
      try {
        const { AuthStorageService } = await import('@/services');
        const authStorageService = AuthStorageService.getInstance();
        const authData = await authStorageService.getAuthData();
        console.log('🔑 Auth Token Test:', {
          hasAuthData: !!authData,
          hasAccessToken: !!authData?.accessToken,
          tokenLength: authData?.accessToken ? authData.accessToken.length : 0,
          tokenPrefix: authData?.accessToken ? authData.accessToken.substring(0, 10) + '...' : 'none'
        });
      } catch (authError) {
        console.error('🔑 Auth token check failed:', authError);
      }
      
      try {
        const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
        console.log('🌐 API Health Check:', {
          status: response.status,
          ok: response.ok,
          url: response.url
        });
      } catch (connectivityError) {
        console.warn('🌐 API Health Check failed (might be normal):', connectivityError);
      }
      
      const walletService = WalletService.getInstance();
      
      try {
        const details = await walletService.getWalletDetails();
        console.log('✅ Wallet details success:', details);
      } catch (detailsError: any) {
        console.error('❌ Wallet details error:', {
          message: detailsError.message,
          statusCode: detailsError.statusCode,
          error: detailsError.error,
          details: detailsError.details
        });
      }
      
      try {
        const balance = await walletService.getWalletBalance();
        console.log('✅ Wallet balance success:', balance);
      } catch (balanceError: any) {
        console.error('❌ Wallet balance error:', {
          message: balanceError.message,
          statusCode: balanceError.statusCode,
          error: balanceError.error,
          details: balanceError.details
        });
      }
      
    } catch (error) {
      console.error('🧪 Manual test error:', error);
    }
  };

  // Test wallet endpoints when user is authenticated and KYC is loaded
  useEffect(() => {
    if (kycStatus && (kycStatus as any)?.kycStatus) {
      console.log('🧪 Triggering wallet endpoint test for authenticated user...');
      testWalletEndpoints();
    }
  }, [kycStatus]);

  // KYC Status Fallback - Always hit endpoint for all users
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, skipping KYC status fallback');
      return;
    }

    console.log('🔄 KYC Status Fallback System Active - will use KYC data when available');
    
    if (kycStatus) {
      const statusData = kycStatus as any;
      console.log('📋 KYC Status Fallback Data:', {
        kycStatus: statusData?.kycStatus,
        isVerified: statusData?.isVerified,
        bvnVerified: statusData?.bvnVerified,
        selfieVerified: statusData?.selfieVerified,
        isFreshRegistration: props.isFreshRegistration
      });

      if (props.isFreshRegistration) {
        console.log('🆕 Fresh registration already handled, KYC status will be used for future sessions');
        return;
      }

      const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                             statusData?.isVerified && 
                             statusData?.bvnVerified && 
                             statusData?.selfieVerified;

      if (!isFullyVerified) {
        console.log('⚠️ User not fully verified based on KYC status, checking if modal should be shown');
        
        if (!props.showVerificationModal) {
          console.log('📱 Showing KYC verification modal based on status');
          props.setIsWalletActivationMode(false);
          props.setIsPendingVerification(statusData?.kycStatus === 'UNDER_REVIEW');
          props.setShowVerificationModal(true);
        }
      } else {
        console.log('✅ User is fully verified based on KYC status');
      }
    } else if (kycIsError && !kycLoading && !props.isFreshRegistration) {
      console.error('❌ KYC Status API failed, using fallback for login users:', kycError?.message);
      
      if (!props.showVerificationModal) {
        console.log('🆘 Showing verification modal as KYC API fallback');
        props.setIsWalletActivationMode(false);
        props.setIsPendingVerification(false);
        props.setShowVerificationModal(true);
      }
    } else if (!kycLoading && !kycStatus && !kycIsError && !props.isFreshRegistration) {
      console.log('⚠️ No KYC data returned, treating as unverified user');
      
      if (!props.showVerificationModal) {
        console.log('📱 Showing verification modal for no KYC data scenario');
        props.setIsWalletActivationMode(false);
        props.setIsPendingVerification(false);
        props.setShowVerificationModal(true);
      }
    }
  }, [isAuthenticated, kycStatus, kycIsError, kycLoading, kycError, props.isFreshRegistration, props.showVerificationModal]);

  // Legacy AsyncStorage-based verification status
  useEffect(() => {
    if (kycStatus && (kycStatus as any)?.kycStatus === 'APPROVED') {
      console.log('✅ User is APPROVED, no verification modals needed');
      return;
    }

    if (kycStatus && (kycStatus as any)?.kycStatus !== 'APPROVED') {
      const checkLegacyVerificationStatus = async () => {
        try {
          const showPendingModal = await AsyncStorage.getItem('show_pending_modal');
          
          if (props.isFreshRegistration) {
            console.log('🆕 Skipping legacy verification logic - fresh registration handled separately');
            return;
          }
          
          if (showPendingModal === 'true') {
            console.log('🔔 Legacy pending modal flag detected');
            await AsyncStorage.removeItem('show_pending_modal');
            props.setIsPendingVerification(true);
            props.setShowVerificationModal(true);
          }
        } catch (error) {
          console.error('Error checking legacy verification status:', error);
        }
      };

      checkLegacyVerificationStatus();
    }
  }, [kycStatus, props.isFreshRegistration, props.showVerificationModal]);

  // Check wallet availability for verified users
  useEffect(() => {
    if (kycStatus) {
      const statusData = kycStatus as any;
      
      const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                             statusData?.isVerified && 
                             statusData?.bvnVerified && 
                             statusData?.selfieVerified;
      
      if (isFullyVerified) {
        console.log('🔍 User is fully verified, checking wallet availability first...');
        
        if (props.isFreshRegistration) {
          console.log('🆕 Skipping wallet availability check - fresh registration modal has priority');
          return;
        }
        
        const hasWalletData = walletDetails && walletBalance;
        
        const hasWalletDetailsError = walletDetailsError && 
          (walletDetailsError.message?.includes('not found') || 
           walletDetailsError.message?.includes('Wallet not found') ||
           walletDetailsError.statusCode === 404);
           
        const hasWalletBalanceError = walletBalanceError && 
          (walletBalanceError.message?.includes('not found') || 
           walletBalanceError.message?.includes('Wallet not found') ||
           walletBalanceError.statusCode === 404);

        console.log('💳 Wallet availability check for verified user:', {
          kycStatus: statusData?.kycStatus,
          hasWalletDetails: !!walletDetails,
          hasWalletBalance: !!walletBalance,
          hasWalletData,
          walletDetailsError: walletDetailsError?.message,
          walletBalanceError: walletBalanceError?.message,
          hasWalletDetailsError,
          hasWalletBalanceError
        });

        if (hasWalletData) {
          console.log('✅ User has wallet data, no activation needed');
          props.setIsWalletActivationMode(false);
          props.setShowVerificationModal(false);
        } else if (hasWalletDetailsError || hasWalletBalanceError) {
          console.log('⚠️ User missing wallet data, showing activation modal');
          props.setIsWalletActivationMode(true);
          props.setIsPendingVerification(false);
          props.setShowVerificationModal(true);
        } else if (!walletDetails && !walletBalance && !walletDetailsError && !walletBalanceError) {
          console.log('⏳ Wallet data still loading, waiting...');
        }
      } else {
        console.log('⚠️ User not fully verified, showing verification modal');
        
        if (props.isFreshRegistration) {
          console.log('🆕 Skipping unverified modal - fresh registration modal has priority');
          return;
        }
        
        props.setIsWalletActivationMode(false);
        props.setIsPendingVerification(false);
        props.setShowVerificationModal(true);
      }
    }
  }, [kycStatus, walletDetails, walletBalance, walletDetailsError, walletBalanceError, props.isFreshRegistration]);

  // Check PIN status for users with wallet access
  useEffect(() => {
    if (kycStatus && walletDetails && walletBalance && pinStatus) {
      const statusData = kycStatus as any;
      
      const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                             statusData?.isVerified && 
                             statusData?.bvnVerified && 
                             statusData?.selfieVerified;

      const hasWalletAccess = walletDetails && walletBalance;

      if (isFullyVerified && hasWalletAccess) {
        console.log('🔑 Checking PIN status for user with wallet access:', {
          hasPinSet: pinStatus.hasPinSet,
          walletExists: pinStatus.walletExists,
          message: pinStatus.message
        });

        if (pinStatus.walletExists && !pinStatus.hasPinSet) {
          console.log('⚠️ Wallet exists but no PIN set, showing PIN setup modal');
          props.setShowSetPinModal(true);
        } else if (pinStatus.hasPinSet) {
          console.log('✅ PIN is already set, user can proceed with transfers');
        } else if (!pinStatus.walletExists) {
          console.log('❌ Wallet does not exist, should show wallet activation');
        }
      }
    }
  }, [kycStatus, walletDetails, walletBalance, pinStatus]);

  return {
    isAuthenticated,
    kycStatus,
    kycError,
    kycLoading,
    kycIsError,
    walletDetails,
    walletDetailsError,
    walletBalance,
    walletBalanceError,
    pinStatus,
  };
} 