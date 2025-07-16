import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/providers/AuthProvider';
import { useKYCStatus } from '@/hooks/useKYCService';
import { useWalletDetails, useWalletBalance, usePinStatus } from '@/hooks/useWalletService';
import { WalletService } from '@/services';
import ToastService from '@/services/ToastService';

interface BackendChecksProps {
  enabled?: boolean; // Whether to run backend checks
  isFreshRegistration: boolean;
  isInKYCFlow: boolean;
  showVerificationModal: boolean;
  showSetPinModal: boolean;
  setIsFreshRegistration: (value: boolean) => void;
  setIsWalletActivationMode: (value: boolean) => void;
  setIsPendingVerification: (value: boolean) => void;
  setShowVerificationModal: (value: boolean) => void;
  setShowSetPinModal: (value: boolean) => void;
  setAreAllChecksComplete: (value: boolean) => void;
  setShowPulsatingGlow: (value: boolean) => void;
  onSetPinModalClose?: () => void;
}

export function useBackendChecks(props: BackendChecksProps) {
  const { isAuthenticated, user, authToken } = useAuth();
  
  // Always call hooks but only use data when enabled
  const { data: kycStatus, error: kycError, isLoading: kycLoading, isError: kycIsError } = useKYCStatus();
  const { data: walletDetails, error: walletDetailsError, isLoading: walletDetailsLoading, isError: walletDetailsIsError } = useWalletDetails();
  const { data: walletBalance, error: walletBalanceError, isLoading: walletBalanceLoading, isError: walletBalanceIsError } = useWalletBalance();
  const { data: pinStatus } = usePinStatus();

  // Track if PIN modal has been shown to prevent duplicates
  const [pinModalShown, setPinModalShown] = useState(false);
  const [pinModalDebounce, setPinModalDebounce] = useState(false);
  
  // Sequential check states
  const [currentCheckPhase, setCurrentCheckPhase] = useState<'kyc' | 'wallet' | 'pin' | 'complete'>('kyc');
  const [checksStarted, setChecksStarted] = useState(false);

  // Function to reset PIN modal shown flag
  const resetPinModalShown = () => {
    console.log('🔄 Resetting PIN modal shown flag');
    setPinModalShown(false);
  };

  // Start sequential checks when enabled
  useEffect(() => {
    const isProperlyAuthenticated = isAuthenticated && !!user && !!authToken;
    
    if (props.enabled && !checksStarted && isProperlyAuthenticated) {
      console.log('🚀 Starting sequential backend checks...');
      setChecksStarted(true);
      setCurrentCheckPhase('kyc');
    } else if (!props.enabled && checksStarted) {
      console.log('🛑 Backend checks disabled - resetting check states');
      setChecksStarted(false);
      setCurrentCheckPhase('kyc');
      // Don't reset pulsating glow or other UI states here - let the component decide
    } else if (!isProperlyAuthenticated && checksStarted) {
      console.log('🚪 User logged out - stopping backend checks');
      setChecksStarted(false);
      setCurrentCheckPhase('kyc');
    }
  }, [props.enabled, isAuthenticated, user, authToken, checksStarted]);

  // Debug authentication state
  useEffect(() => {
    console.log('🔐 Authentication Debug:', {
      isAuthenticated,
      hasUser: !!user,
      hasAuthToken: !!authToken,
      userEmail: user?.email,
      userId: user?.id,
      enabled: props.enabled,
      checksStarted
    });
  }, [isAuthenticated, user, authToken, props.enabled, checksStarted]);

  // Sequential backend checks - Phase 1: KYC
  useEffect(() => {
    if (!checksStarted || !props.enabled || currentCheckPhase !== 'kyc') return;

    console.log('📋 Phase 1: KYC Check', {
      kycLoading,
      kycStatus,
      kycError: kycError?.message,
      kycIsError
    });

    if (!kycLoading) {
      console.log('✅ KYC check complete, moving to wallet phase...');
      setCurrentCheckPhase('wallet');
    }
  }, [checksStarted, props.enabled, currentCheckPhase, kycLoading, kycStatus, kycError, kycIsError]);

  // Sequential backend checks - Phase 2: Wallet
  useEffect(() => {
    if (!checksStarted || !props.enabled || currentCheckPhase !== 'wallet') return;

    console.log('💳 Phase 2: Wallet Check', {
      walletDetailsLoading,
      walletDetails: !!walletDetails,
      walletDetailsError: walletDetailsError?.message,
      walletBalanceLoading,
      walletBalance: !!walletBalance,
      walletBalanceError: walletBalanceError?.message
    });

    const walletDetailsComplete = !walletDetailsLoading;
    const walletBalanceComplete = !walletBalanceLoading;

    if (walletDetailsComplete && walletBalanceComplete) {
      console.log('✅ Wallet check complete, moving to PIN phase...');
      setCurrentCheckPhase('pin');
    }
  }, [checksStarted, props.enabled, currentCheckPhase, walletDetailsLoading, walletDetails, walletDetailsError, walletBalanceLoading, walletBalance, walletBalanceError]);

  // Sequential backend checks - Phase 3: PIN
  useEffect(() => {
    if (!checksStarted || !props.enabled || currentCheckPhase !== 'pin') return;

    console.log('🔑 Phase 3: PIN Check', {
      pinStatus,
      hasPinData: !!pinStatus
    });

    // PIN status is usually quick, so we can move to completion
    if (pinStatus) {
      console.log('✅ PIN check complete, moving to completion phase...');
      setCurrentCheckPhase('complete');
    }
  }, [checksStarted, props.enabled, currentCheckPhase, pinStatus]);

  // Main backend checks effect with comprehensive state management
  useEffect(() => {
    // Early return if backend checks are disabled
    if (!props.enabled) {
      console.log('⚠️ Backend checks disabled, skipping all checks');
      return;
    }

    const isProperlyAuthenticated = isAuthenticated && !!user && !!authToken;
    
    if (!checksStarted || !isProperlyAuthenticated) {
      console.log('⚠️ Backend checks not started or user not properly authenticated');
      return;
    }

    const kycCheckComplete = !kycLoading && (kycStatus || kycIsError);
    const walletDetailsComplete = !walletDetailsLoading && (walletDetails || walletDetailsError);
    const walletBalanceComplete = !walletBalanceLoading && (walletBalance || walletBalanceError);
    
    const allChecksComplete = kycCheckComplete && walletDetailsComplete && walletBalanceComplete;

    console.log('🔍 Backend Checks Status:', {
      isAuthenticated,
      enabled: props.enabled,
      checksStarted,
      currentPhase: currentCheckPhase,
      kycCheckComplete,
      walletDetailsComplete,
      walletBalanceComplete,
      allChecksComplete,
    });

    if (allChecksComplete || currentCheckPhase === 'complete') {
      const kycSuccessful = kycStatus && !kycIsError;
      const hasSuccessfulWalletData = walletDetails && walletBalance && !walletDetailsError && !walletBalanceError;
      
      // Don't show verification modal if user is actively in KYC flow
      if (props.isInKYCFlow) {
        console.log('🔄 User is in KYC flow, skipping verification modal');
        props.setShowPulsatingGlow(false);
        props.setAreAllChecksComplete(true);
        return;
      }
      
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

      // Handle backend service failures gracefully
      if (kycIsError || walletDetailsError || walletBalanceError) {
        console.log('⚠️ Some backend services unavailable, allowing camera usage');
        props.setShowPulsatingGlow(false);
        props.setAreAllChecksComplete(true);
        // Don't auto-show verification modal for backend failures
        return;
      }

      console.log('⚠️ Some checks failed or user needs verification');
      props.setShowPulsatingGlow(false);
      props.setAreAllChecksComplete(true);
      props.setShowVerificationModal(true);
    } else {
      console.log(`⏳ Backend checks still running - Phase: ${currentCheckPhase}`);
      props.setShowPulsatingGlow(true);
      props.setAreAllChecksComplete(false);
    }
  }, [
    props.enabled,
    checksStarted,
    currentCheckPhase,
    isAuthenticated, 
    kycStatus, kycLoading, kycIsError,
    walletDetails, walletDetailsLoading, walletDetailsError,
    walletBalance, walletBalanceLoading, walletBalanceError,
    props.isFreshRegistration, props.showVerificationModal, props.isInKYCFlow
  ]);

  // COMPREHENSIVE FLOW SUMMARY for debugging
  useEffect(() => {
    if (!props.enabled) return;
    
    console.log('🌊 COMPREHENSIVE FLOW SUMMARY:', {
      enabled: props.enabled,
      checksStarted,
      currentPhase: currentCheckPhase,
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
    props.enabled,
    checksStarted,
    currentCheckPhase,
    isAuthenticated, user, authToken, props.isFreshRegistration, 
    kycStatus, kycLoading, kycIsError, kycError,
    props.showVerificationModal
  ]);

  // Rest of the existing logic remains the same but only runs when enabled
  // Debug wallet access conditions
  useEffect(() => {
    if (!props.enabled || !kycStatus) return;
    
    const statusData = kycStatus as any;
    const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                           statusData?.isVerified && 
                           statusData?.bvnVerified && 
                           statusData?.selfieVerified;
    
    console.log('🔐 Wallet Access Debug:', {
      enabled: props.enabled,
      kycStatus: statusData?.kycStatus,
      isVerified: statusData?.isVerified,
      bvnVerified: statusData?.bvnVerified,
      selfieVerified: statusData?.selfieVerified,
      isFullyVerified,
      shouldHaveWalletAccess: isFullyVerified
    });
  }, [props.enabled, kycStatus]);

  // Manual wallet endpoint test function
  const testWalletEndpoints = async () => {
    if (!props.enabled) return;
    
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
    if (props.enabled && kycStatus && (kycStatus as any)?.kycStatus) {
      console.log('🧪 Triggering wallet endpoint test for authenticated user...');
      testWalletEndpoints();
    }
  }, [props.enabled, kycStatus]);

  // KYC Status Fallback - Always hit endpoint for all users
  useEffect(() => {
    const isProperlyAuthenticated = isAuthenticated && !!user && !!authToken;
    
    if (!props.enabled || !isProperlyAuthenticated) {
      console.log('❌ Backend checks disabled or user not properly authenticated, skipping KYC status fallback');
      return;
    }

    // Don't show verification modal if user is actively in KYC flow
    if (props.isInKYCFlow) {
      console.log('🔄 User is in KYC flow, skipping KYC status fallback');
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
      
      // Don't auto-show modal for API failures - let user use camera
      console.log('🎥 Allowing camera usage despite KYC API failure');
    } else if (!kycLoading && !kycStatus && !kycIsError && !props.isFreshRegistration) {
      console.log('⚠️ No KYC data returned, treating as unverified user');
      
      if (!props.showVerificationModal) {
        console.log('📱 Showing verification modal for no KYC data scenario');
        props.setIsWalletActivationMode(false);
        props.setIsPendingVerification(false);
        props.setShowVerificationModal(true);
      }
    }
  }, [props.enabled, isAuthenticated, user, authToken, kycStatus, kycIsError, kycLoading, kycError, props.isFreshRegistration, props.showVerificationModal, props.isInKYCFlow]);

  // Legacy AsyncStorage-based verification status
  useEffect(() => {
    if (!props.enabled) return;
    
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
  }, [props.enabled, kycStatus, props.isFreshRegistration, props.showVerificationModal]);

  // Check wallet availability for verified users
  useEffect(() => {
    if (!props.enabled) return;
    
    // Don't show verification modal if user is actively in KYC flow
    if (props.isInKYCFlow) {
      console.log('🔄 User is in KYC flow, skipping wallet availability check');
      return;
    }
    
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
          // For APPROVED users, don't show activation modal - wallet will be created automatically
          if (statusData?.kycStatus === 'APPROVED') {
            console.log('✅ APPROVED user - wallet will be created automatically, no activation modal needed');
            props.setIsWalletActivationMode(false);
            props.setShowVerificationModal(false);
          } else {
            console.log('⚠️ VERIFIED user missing wallet data, showing activation modal');
            props.setIsWalletActivationMode(true);
            props.setIsPendingVerification(false);
            props.setShowVerificationModal(true);
          }
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
  }, [props.enabled, kycStatus, walletDetails, walletBalance, walletDetailsError, walletBalanceError, props.isFreshRegistration, props.isInKYCFlow]);

  // Check PIN status for users with wallet access
  useEffect(() => {
    if (!props.enabled) return;
    
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
          message: pinStatus.message,
          pinModalShown
        });

        if (pinStatus.walletExists && !pinStatus.hasPinSet && !pinModalShown && !pinModalDebounce) {
          console.log('⚠️ Wallet exists but no PIN set, showing PIN setup modal');
          setPinModalShown(true);
          setPinModalDebounce(true);
          props.setShowSetPinModal(true);
          
          // Reset debounce after 2 seconds
          setTimeout(() => {
            setPinModalDebounce(false);
          }, 2000);
        } else if (pinStatus.hasPinSet) {
          console.log('✅ PIN is already set, user can proceed with transfers');
          // Reset PIN modal shown flag when PIN is set
          setPinModalShown(false);
          setPinModalDebounce(false);
        } else if (!pinStatus.walletExists) {
          console.log('❌ Wallet does not exist, should show wallet activation');
        }
      }
    }
  }, [props.enabled, kycStatus, walletDetails, walletBalance, pinStatus, pinModalShown]);

  // Reset PIN modal shown flag when modal is closed
  useEffect(() => {
    if (!props.showSetPinModal && pinModalShown) {
      console.log('🔄 PIN modal closed, resetting shown flag');
      setPinModalShown(false);
      setPinModalDebounce(false);
    }
  }, [props.showSetPinModal, pinModalShown]);

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
    resetPinModalShown,
    currentCheckPhase,
    checksStarted,
  };
} 