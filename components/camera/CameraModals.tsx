import React from 'react';
import { BankTransferModal, VerificationModal, SetPinModal } from '@/components/common';
import { ExtractedBankData } from '@/services';

interface CameraModalsProps {
  showBankTransferModal: boolean;
  showVerificationModal: boolean;
  showSetPinModal: boolean;
  extractedData: ExtractedBankData | null;
  isWalletActivationMode: boolean;
  isPendingVerification: boolean;
  walletRecoveryPending: boolean;
  onBankModalClose: () => void;
  onBankModalConfirm: (resolvedAccountName?: string, selectedBankName?: string, accountNumber?: string) => void;
  onBankModalSuccess: () => void;
  onVerificationModalClose: () => void;
  onVerifyID: () => void;
  onSetPinModalClose: () => void;
  onSetPinSuccess: () => void;
}

export default function CameraModals({
  showBankTransferModal,
  showVerificationModal,
  showSetPinModal,
  extractedData,
  isWalletActivationMode,
  isPendingVerification,
  walletRecoveryPending,
  onBankModalClose,
  onBankModalConfirm,
  onBankModalSuccess,
  onVerificationModalClose,
  onVerifyID,
  onSetPinModalClose,
  onSetPinSuccess,
}: CameraModalsProps) {
  return (
    <>
      {/* Bank Transfer Modal */}
      <BankTransferModal
        visible={showBankTransferModal}
        onClose={onBankModalClose}
        onConfirmTransfer={onBankModalConfirm}
        onSuccess={onBankModalSuccess}
        amount={extractedData?.amount || '0'}
        nairaAmount={`N${extractedData?.amount || '0'}`}
        extractedData={extractedData || undefined}
      />

      {/* Verification Modal */}
      <VerificationModal
        visible={showVerificationModal}
        onClose={onVerificationModalClose}
        onVerifyID={onVerifyID}
        title={
          isWalletActivationMode ? "Activate Your\nWallet" :
          isPendingVerification ? "Verification\nPending.." : 
          "Complete your\nverification"
        }
        description={
          isWalletActivationMode ? "Your verification is complete! Activate your wallet to start using all features and transfer money." :
          isPendingVerification ? "Verification should take 2 - 4 hrs\n\nYou will be notified" : 
          "Complete account verification with your BVN and selfie to start using Monzi"
        }
        buttonText={
          isWalletActivationMode ? 
            (walletRecoveryPending ? "Activating wallet" : "Activate Wallet") :
          isPendingVerification ? "Got it" : 
          "Continue Verification"
        }
        loading={isWalletActivationMode ? walletRecoveryPending : false}
      />

      {/* Set PIN Modal */}
      <SetPinModal
        visible={showSetPinModal}
        onClose={onSetPinModalClose}
        onSuccess={onSetPinSuccess}
      />
    </>
  );
} 