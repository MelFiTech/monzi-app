import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/providers/AuthProvider';
import { useKYCStatus } from '@/hooks/useKYCService';

interface BackendChecksProps {
  enabled?: boolean;
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
  const { data: kycStatus, error: kycError, isLoading: kycLoading, isError: kycIsError } = useKYCStatus();
  
  // Simple state tracking
  const [hasShownModal, setHasShownModal] = useState(false);
  
  // Single effect to handle all backend checks logic
  useEffect(() => {
    const runChecks = async () => {
      // Early returns for disabled or unauthenticated states
      if (!props.enabled) {
        props.setShowPulsatingGlow(false);
        props.setAreAllChecksComplete(true);
        return;
      }
      
      if (props.isInKYCFlow) {
        props.setShowPulsatingGlow(false);
        props.setAreAllChecksComplete(true);
        return;
      }
      
      if (!isAuthenticated || !user || !authToken) {
        return;
      }
      
      // Check if user has dismissed the modal
      try {
        const modalDismissed = await AsyncStorage.getItem('modal_dismissed_by_user');
        if (modalDismissed === 'true') {
          props.setShowPulsatingGlow(false);
          props.setAreAllChecksComplete(true);
          return;
        }
      } catch (error) {
        console.error('Error checking modal dismissed flag:', error);
      }
      
      // Handle KYC loading state
      if (kycLoading) {
        props.setShowPulsatingGlow(false);
        props.setAreAllChecksComplete(false);
        return;
      }
      
      // Handle fresh registration - always show modal for new users
      if (props.isFreshRegistration) {
        props.setShowPulsatingGlow(false);
        props.setAreAllChecksComplete(true);
        if (!props.showVerificationModal) {
          props.setShowVerificationModal(true);
        }
        return;
      }
      
      // Handle KYC status for existing users
      if (kycStatus) {
        const isFullyVerified = (kycStatus.kycStatus === 'VERIFIED' || kycStatus.kycStatus === 'APPROVED') && 
                               kycStatus.isVerified && 
                               kycStatus.bvnVerified && 
                               kycStatus.selfieVerified;
        
        if (isFullyVerified) {
          // User is fully verified - allow camera usage
          props.setShowPulsatingGlow(false);
          props.setAreAllChecksComplete(true);
          return;
        }
        
        // User needs verification - show modal once
        if (!props.showVerificationModal && !hasShownModal) {
          setHasShownModal(true);
          props.setShowPulsatingGlow(false);
          props.setAreAllChecksComplete(false); // Keep camera controls disabled for unverified users
          props.setIsWalletActivationMode(false);
          props.setIsPendingVerification(kycStatus.kycStatus === 'UNDER_REVIEW');
          props.setShowVerificationModal(true);
        } else {
          props.setShowPulsatingGlow(false);
          props.setAreAllChecksComplete(false); // Keep camera controls disabled for unverified users
        }
      } else {
        // No KYC data - allow camera usage
        props.setShowPulsatingGlow(false);
        props.setAreAllChecksComplete(true);
      }
    };
    
    runChecks();
  }, [
    props.enabled,
    props.isInKYCFlow,
    props.isFreshRegistration,
    props.showVerificationModal,
    isAuthenticated,
    user,
    authToken,
    kycStatus,
    kycLoading,
    hasShownModal
  ]);
  
  // Reset modal flag when modal is closed
  useEffect(() => {
    if (!props.showVerificationModal && hasShownModal) {
      setHasShownModal(false);
    }
  }, [props.showVerificationModal, hasShownModal]);
  
  return {
    isAuthenticated,
    kycStatus,
    kycError,
    kycLoading,
    kycIsError,
  };
}