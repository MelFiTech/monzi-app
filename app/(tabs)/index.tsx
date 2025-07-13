import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { CameraHeader } from '@/components/layout';
import { PulsatingGlow } from '@/components/common';
import { CameraPermissions, CameraInterface, CameraControls, CameraModals } from '@/components/camera';
import { useCameraLogic } from '@/hooks/useCameraLogic';
import { useBackendChecks } from '@/hooks/useBackendChecks';
import { useNotificationService } from '@/hooks/useNotificationService';
import { fontFamilies } from '@/constants/fonts';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const { logout, user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  
  // Use custom hooks for logic separation
  const cameraLogic = useCameraLogic();
  const backendChecks = useBackendChecks({
    isFreshRegistration: cameraLogic.isFreshRegistration,
    showVerificationModal: cameraLogic.showVerificationModal,
    setIsFreshRegistration: cameraLogic.setIsFreshRegistration,
    setIsWalletActivationMode: cameraLogic.setIsWalletActivationMode,
    setIsPendingVerification: cameraLogic.setIsPendingVerification,
    setShowVerificationModal: cameraLogic.setShowVerificationModal,
    setShowSetPinModal: cameraLogic.setShowSetPinModal,
    setAreAllChecksComplete: cameraLogic.setAreAllChecksComplete,
    setShowPulsatingGlow: cameraLogic.setShowPulsatingGlow,
  });

  // Real-time notification connection status
  const { 
    isConnected: isNotificationConnected,
  } = useNotificationService(
    {
      autoConnect: true,
      showToasts: false, // Don't show toasts on main screen to avoid overlap with header
      enableBalanceUpdates: false, // Header handles balance updates
      enableTransactionNotifications: false, // Header handles transaction notifications
      enableGeneralNotifications: false, // Header handles general notifications
    },
    {
      onConnect: () => {
        console.log('🔌 [CameraScreen] Real-time notifications connected');
      },
      onDisconnect: () => {
        console.log('🔌 [CameraScreen] Real-time notifications disconnected');
      },
      onError: (error) => {
        console.log('❌ [CameraScreen] Real-time notification error:', error?.message);
      }
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
      {/* Header */}
      <CameraHeader />
      
      {/* Camera Interface - Always show for immediate feedback */}
      <CameraInterface
        cameraRef={cameraLogic.cameraRef}
        cameraType={cameraLogic.cameraType}
        flashMode={cameraLogic.flashMode}
        zoom={cameraLogic.zoom}
        zoomAnimation={cameraLogic.zoomAnimation}
        showInstructions={cameraLogic.showInstructions}
        instructionAnimation={cameraLogic.instructionAnimation}
        isProcessing={cameraLogic.isProcessing}
      />

      {/* Show Pulsating Glow if checks are not complete - overlay on camera */}
      {(cameraLogic.showPulsatingGlow) && (
        <View style={styles.pulsatingGlowOverlay}>
          <PulsatingGlow size={146} />
        </View>
      )}

      {/* Connection Overlay - Show when notifications are disconnected */}
      {!isNotificationConnected && cameraLogic.areAllChecksComplete && !cameraLogic.showPulsatingGlow && (
        <View style={styles.connectionOverlay}>
          <View style={styles.connectionMessageContainer}>
            <Text style={styles.connectionMessageTitle}>Connection Required</Text>
            <Text style={styles.connectionMessage}>
              Please check your connection.
            </Text>
          </View>
        </View>
      )}

      {/* Extracting Overlay - Show during capture/processing */}
      {(cameraLogic.isCapturing || cameraLogic.isProcessing) && (
        <View style={styles.extractingOverlay}>
          <View style={styles.extractingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.extractingText}>
              {cameraLogic.isCapturing ? 'Capturing...' : 'Extracting...'}
            </Text>
          </View>
        </View>
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

      {/* Camera Controls - Show when not capturing/processing */}
      {!cameraLogic.isCapturing && !cameraLogic.isProcessing && (
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
          isConnectionDisabled={!isNotificationConnected || !cameraLogic.areAllChecksComplete}
        />
      )}

      {/* All Modals */}
      <CameraModals
        showBankTransferModal={cameraLogic.showBankTransferModal}
        showVerificationModal={cameraLogic.showVerificationModal}
        showSetPinModal={cameraLogic.showSetPinModal}
        extractedData={cameraLogic.extractedData}
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
  connectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 300,
  },
  connectionMessageContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  connectionMessageTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: fontFamilies.clashDisplay.semibold,
    marginBottom: 12,
    textAlign: 'center',
  },
  connectionMessage: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
  extractingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 500,
  },
  extractingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  extractingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: fontFamilies.sora.medium,
    marginTop: 12,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});