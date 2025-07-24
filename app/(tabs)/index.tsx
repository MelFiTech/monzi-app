import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { CameraHeader } from '@/components/layout';
import { PulsatingGlow, Transaction } from '@/components/common';
import { CameraPermissions, CameraInterface, CameraControls, CameraModals, ExtractionLoader } from '@/components/camera';
import { useCameraLogic } from '@/hooks/useCameraLogic';
import { useBackendChecks } from '@/hooks/useBackendChecks';
import { useNotificationService } from '@/hooks/useNotificationService';
import { useWebSocketCacheIntegration } from '@/hooks/useWalletService';
import { fontFamilies } from '@/constants/fonts';
import ToastService from '@/services/ToastService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const { logout, user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const queryClient = useQueryClient();

  // Backend checks state
  const [backendChecksStarted, setBackendChecksStarted] = useState(false);
  const [backendUnavailableToastShown, setBackendUnavailableToastShown] = useState(false);
  const [delayTimerComplete, setDelayTimerComplete] = useState(false);

  // Wallet data will be handled by backend checks when KYC is verified

  // Use custom hooks for logic separation
  const cameraLogic = useCameraLogic();

  // Initialize backend checks after delay (skip delay for fresh registration)
  useEffect(() => {
    if (!backendChecksStarted && !delayTimerComplete) {
      // Skip delay for fresh registration users
      if (cameraLogic.isFreshRegistration) {
        console.log('🆕 Fresh registration detected - skipping delays and starting immediately');
        setDelayTimerComplete(true);
        setBackendChecksStarted(true);
        // No pulsating glow for fresh registration
        cameraLogic.setShowPulsatingGlow(false);
        cameraLogic.setAreAllChecksComplete(true);
        return;
      }

      console.log('🏠 Home screen loaded, starting 5-second delay before backend checks...');

      // Don't show PulsatingGlow during initial delay - only when backend is unavailable
      cameraLogic.setAreAllChecksComplete(false);

      const delayTimer = setTimeout(() => {
        console.log('⏰ 5-second delay complete, starting backend checks...');
        setDelayTimerComplete(true);
        setBackendChecksStarted(true);
      }, 5000);

      return () => {
        clearTimeout(delayTimer);
      };
    }
  }, [backendChecksStarted, delayTimerComplete, cameraLogic.isFreshRegistration]);

  // Separate effect for toast timer with proper conditions (skip for fresh registration)
  useEffect(() => {
    // Skip network toast for fresh registration users
    if (cameraLogic.isFreshRegistration) {
      console.log('🆕 Skipping network toast for fresh registration user');
      return;
    }

    if (delayTimerComplete && !backendUnavailableToastShown) {
      // Wait 10 seconds after delay completion before showing toast
      const toastTimer = setTimeout(() => {
        // Network toast logic will be handled by backend checks when appropriate
        console.log('⏳ Backend checks will handle network connectivity issues');
      }, 10000); // 10 seconds after the 5-second delay = 15 seconds total

      return () => {
        clearTimeout(toastTimer);
      };
    }
  }, [delayTimerComplete, backendUnavailableToastShown, cameraLogic.isFreshRegistration]);

  // Only start backend checks after delay (or immediately for fresh registration)
  // BUT stop them if verification modal is shown or user is in KYC flow
  const shouldRunBackendChecks = (backendChecksStarted || cameraLogic.isFreshRegistration) &&
    !cameraLogic.showVerificationModal &&
    !cameraLogic.isInKYCFlow;

  // Debug logging for backend checks state
  useEffect(() => {
    if (cameraLogic.showVerificationModal && (backendChecksStarted || cameraLogic.isFreshRegistration)) {
      console.log('🛑 Backend checks STOPPED - verification modal is shown');
    }
    if (cameraLogic.isInKYCFlow && (backendChecksStarted || cameraLogic.isFreshRegistration)) {
      console.log('🛑 Backend checks STOPPED - user is in KYC flow');
    }
    if (shouldRunBackendChecks) {
      console.log('✅ Backend checks ENABLED');
    } else if (backendChecksStarted || cameraLogic.isFreshRegistration) {
      console.log('❌ Backend checks DISABLED - modal shown or in KYC flow');
    }
  }, [shouldRunBackendChecks, cameraLogic.showVerificationModal, cameraLogic.isInKYCFlow, backendChecksStarted, cameraLogic.isFreshRegistration]);

  const backendChecks = useBackendChecks({
    enabled: shouldRunBackendChecks,
    isFreshRegistration: cameraLogic.isFreshRegistration,
    isInKYCFlow: cameraLogic.isInKYCFlow,
    showVerificationModal: cameraLogic.showVerificationModal,
    showSetPinModal: cameraLogic.showSetPinModal,
    setIsFreshRegistration: cameraLogic.setIsFreshRegistration,
    setIsWalletActivationMode: cameraLogic.setIsWalletActivationMode,
    setIsPendingVerification: cameraLogic.setIsPendingVerification,
    setShowVerificationModal: cameraLogic.setShowVerificationModal,
    setShowSetPinModal: cameraLogic.setShowSetPinModal,
    setAreAllChecksComplete: cameraLogic.setAreAllChecksComplete,
    setShowPulsatingGlow: cameraLogic.setShowPulsatingGlow,
  });

  // Memoized notification callbacks to prevent reconnection cycles
  const handleNotificationConnect = useCallback(() => {
    console.log('🔌 [CameraScreen] Real-time notifications connected');
  }, []);

  const handleNotificationDisconnect = useCallback(() => {
    console.log('🔌 [CameraScreen] Real-time notifications disconnected');
  }, []);

  const handleNotificationError = useCallback((error: any) => {
    console.log('❌ [CameraScreen] Real-time notification error:', error?.message);
  }, []);

  // WebSocket cache integration
  const { handleBalanceUpdate, handleTransactionNotification: handleWSTransactionNotification } = useWebSocketCacheIntegration();

  // Handle transaction notifications to refresh transaction history
  const handleTransactionNotification = useCallback((transaction: any) => {
    console.log('💰 [CameraScreen] New transaction received:', transaction);

    // Use the new WebSocket cache integration
    handleWSTransactionNotification(transaction);

    // 🚀 FIXED: Use correct standardized query key for transaction invalidation
    queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });

    // If transaction history is currently open, the list will auto-refresh
    // due to React Query's cache invalidation
  }, [queryClient, handleWSTransactionNotification]);

  // Handle wallet balance updates to refresh transaction history
  const handleWalletBalanceUpdate = useCallback((balanceUpdate: any) => {
    console.log('💰 [CameraScreen] Wallet balance updated:', balanceUpdate);

    // Use the new WebSocket cache integration
    handleBalanceUpdate(balanceUpdate);

    // 🚀 FIXED: Use correct standardized query key for transaction invalidation
    queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
  }, [queryClient, handleBalanceUpdate]);

  // Real-time notification connection status
  const {
    isConnected: isNotificationConnected,
  } = useNotificationService(
    {
      autoConnect: true,
      showToasts: false, // Don't show toasts on main screen to avoid overlap with header
      enableBalanceUpdates: true, // Enable to refresh transaction history on balance changes
      enableTransactionNotifications: true, // Enable to refresh transaction history
      enableGeneralNotifications: false, // Header handles general notifications
    },
    {
      onConnect: handleNotificationConnect,
      onDisconnect: handleNotificationDisconnect,
      onError: handleNotificationError,
      onTransactionNotification: handleTransactionNotification,
      onWalletBalanceUpdate: handleWalletBalanceUpdate,
    }
  );



  // Request camera permissions on component mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Handle camera permissions
  if (!permission || !permission.granted) {
    return (
      <CameraPermissions
        permission={permission}
        onRequestPermission={requestPermission}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Hide when transaction history is open */}
      {!cameraLogic.showTransactionHistory && <CameraHeader />}

      {/* Camera Interface - Always show but blur when app is in background */}
      <CameraInterface
        cameraRef={cameraLogic.cameraRef}
        cameraType={cameraLogic.cameraType}
        flashMode={cameraLogic.flashMode}
        zoom={cameraLogic.zoom}
        zoomAnimation={cameraLogic.zoomAnimation}
        showInstructions={cameraLogic.showInstructions}
        instructionAnimation={cameraLogic.instructionAnimation}
        isProcessing={cameraLogic.isProcessing}
        dimViewfinderRings={cameraLogic.showTransactionHistory}
        isAppInBackground={cameraLogic.isAppInBackground}
      />

      {/* Blur overlay when app is in background for privacy */}
      {cameraLogic.isAppInBackground && (
        <BlurView
          intensity={100}
          tint="dark"
          style={styles.blurOverlay}
        >
          <View style={styles.splashOverlay}>
            <Image 
              source={require('@/assets/splash/splash.png')}
              style={styles.splashImage}
              resizeMode="contain"
            />
          </View>
        </BlurView>
      )}

      {/* Fallback dark overlay when app is in background */}
      {cameraLogic.isAppInBackground && (
        <View style={styles.darkOverlay} />
      )}

      {/* Show Pulsating Glow only when backend is not readily available */}
      {cameraLogic.showPulsatingGlow && (
        <View style={styles.pulsatingGlowOverlay}>
          <PulsatingGlow size={146} />
        </View>
      )}

      {/* Extraction Loader - Show during processing with captured image background */}
      {cameraLogic.showExtractionLoader && cameraLogic.capturedImageUri && (
        <ExtractionLoader
          visible={cameraLogic.showExtractionLoader}
          imageUri={cameraLogic.capturedImageUri}
          onComplete={(extractedData) => {
            console.log('Extraction completed:', extractedData);
            // The extraction completion is handled in useCameraLogic
          }}
        />
      )}

      {/* Flash Animation Overlay */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: cameraLogic.flashAnimation,
            backgroundColor: 'white',
          }
        ]}
        pointerEvents="none"
      />

      {/* Camera Controls - Show when not capturing/processing/extracting */}
      {!cameraLogic.isCapturing && !cameraLogic.isProcessing && !cameraLogic.showExtractionLoader && (
        <CameraControls
          zoom={cameraLogic.zoom}
          flashMode={cameraLogic.flashMode}
          isCapturing={cameraLogic.isCapturing}
          isProcessing={cameraLogic.isProcessing}
          onZoomChange={cameraLogic.handleZoomChange}
          onToggleFlash={cameraLogic.toggleFlash}
          onCapture={cameraLogic.handleCapture}
          onOpenGallery={cameraLogic.openGallery}
          onViewHistory={cameraLogic.handleViewHistory}
          isConnectionDisabled={!cameraLogic.areAllChecksComplete}
          showTransactionHistory={cameraLogic.showTransactionHistory}
          transactions={cameraLogic.transactionsData.transactions}
          onTransactionPress={(transaction: Transaction) => {
            console.log('Transaction pressed:', transaction);
            // Navigate to transaction detail screen with just the ID
            router.push({
              pathname: '/transaction-detail',
              params: {
                id: transaction.id,
              }
            });
          }}
          loading={cameraLogic.transactionsData.loading}
          refreshing={cameraLogic.transactionsData.refreshing}
          onRefresh={cameraLogic.transactionsData.onRefresh}
          onEndReached={cameraLogic.transactionsData.onEndReached}
          hasMoreData={cameraLogic.transactionsData.hasMoreData}
          onRequestStatement={() => {
            console.log('Request statement');
            // TODO: Handle statement request
            cameraLogic.setShowTransactionHistory(false);
          }}
        />
      )}

      {/* All Modals */}
      <CameraModals
        showBankTransferModal={cameraLogic.showBankTransferModal}
        showVerificationModal={cameraLogic.showVerificationModal}
        showSetPinModal={cameraLogic.showSetPinModal}
        extractedData={cameraLogic.extractedData}
        capturedImageUri={cameraLogic.capturedImageUri}
        isWalletActivationMode={cameraLogic.isWalletActivationMode}
        isPendingVerification={cameraLogic.isPendingVerification}
        walletRecoveryPending={cameraLogic.walletRecoveryMutation.isPending}
        onBankModalClose={cameraLogic.handleBankModalClose}
        onBankModalConfirm={cameraLogic.handleBankModalConfirm}
        onBankModalSuccess={cameraLogic.handleBankModalSuccess}
        onVerificationModalClose={cameraLogic.handleVerificationModalClose}
        onVerifyID={cameraLogic.handleVerifyID}
        onSetPinModalClose={cameraLogic.handleSetPinModalClose}
        onSetPinSuccess={cameraLogic.handleSetPinSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pulsatingGlowContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  pulsatingGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 250,
  },
  delayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    marginTop: 20,
    textAlign: 'center',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFE66C',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  splashImage: {
    width: '80%',
    height: '80%',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 999,
  },
});