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
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { CameraHeader } from '@/components/layout';
import { PulsatingGlow, Transaction } from '@/components/common';
import { CameraPermissions, CameraInterface, CameraControls, CameraModals } from '@/components/camera';
import { useCameraLogic } from '@/hooks/useCameraLogic';
import { useBackendChecks } from '@/hooks/useBackendChecks';
import { useNotificationService } from '@/hooks/useNotificationService';
import { fontFamilies } from '@/constants/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const { logout, user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const queryClient = useQueryClient();
  
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

  // Handle transaction notifications to refresh transaction history
  const handleTransactionNotification = useCallback((transaction: any) => {
    console.log('💰 [CameraScreen] New transaction received:', transaction);
    
    // Invalidate and refetch transaction queries to get updated list
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    
    // If transaction history is currently open, the list will auto-refresh
    // due to React Query's cache invalidation
  }, [queryClient]);

  // Handle wallet balance updates to refresh transaction history
  const handleWalletBalanceUpdate = useCallback((balanceUpdate: any) => {
    console.log('💰 [CameraScreen] Wallet balance updated:', balanceUpdate);
    
    // Invalidate and refetch transaction queries when balance changes
    // (indicates a transaction has occurred)
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  }, [queryClient]);

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

  // Auto-lock polling effect
  useEffect(() => {
    let isActive = true;
    const interval = setInterval(async () => {
      const requireReauth = await AsyncStorage.getItem('requireReauth');
      if (requireReauth === 'true' && isActive) {
        clearInterval(interval);
        router.replace('/(auth)/splash');
      }
    }, 1000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

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
        dimViewfinderRings={cameraLogic.showTransactionHistory}
      />

      {/* Show Pulsating Glow if checks are not complete - overlay on camera */}
      {(cameraLogic.showPulsatingGlow) && (
        <View style={styles.pulsatingGlowOverlay}>
          <PulsatingGlow size={146} />
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
          isConnectionDisabled={!cameraLogic.areAllChecksComplete}
          showTransactionHistory={cameraLogic.showTransactionHistory}
          transactions={cameraLogic.transactionsData.transactions}
          onTransactionPress={(transaction: Transaction) => {
            console.log('Transaction pressed:', transaction);
            // TODO: Navigate to transaction details
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