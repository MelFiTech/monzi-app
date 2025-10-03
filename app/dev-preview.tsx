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
  ScrollView,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { CameraHeader } from '@/components/layout';
import { PulsatingGlow, Transaction, LocationSuggestionModal, LocationFloatingButton, FloatingButton, ActionStrip, Pill, SuggestionStrip, HeaderCard, Banner } from '@/components/common';
import { CameraPermissions, CameraInterface, CameraControls, CameraModals, ExtractionLoader } from '@/components/camera';
import { useCameraLogic } from '@/hooks/useCameraLogic';
import { useBackendChecks } from '@/hooks/useBackendChecks';
import { useNotificationService } from '@/hooks/useNotificationService';
import { usePushNotificationService } from '@/hooks/usePushNotificationService';
import { useWebSocketCacheIntegration } from '@/hooks/useWalletService';
import { useGetCurrentLocation } from '@/hooks/useLocationService';
import { useWebSocketLocationService } from '@/hooks/useWebSocketLocationService';
import { fontFamilies } from '@/constants/fonts';
import ToastService from '@/services/ToastService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function DevPreviewScreen() {
  const { logout, user, authToken } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const queryClient = useQueryClient();

  // Location suggestion state
  const [showLocationSuggestion, setShowLocationSuggestion] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPaymentData, setLocationPaymentData] = useState<any>(null);
  const [isLocationButtonLoading, setIsLocationButtonLoading] = useState(false);
  const getLocationMutation = useGetCurrentLocation();

  // Suggestion strip state
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestions] = useState([
    {
      accountNumber: '1123456985',
      bankName: 'PalmPay',
      accountName: 'Q.F.A Nigerian Limited...',
      frequency: 5
    },
    {
      accountNumber: '1123456986',
      bankName: 'PalmPay',
      accountName: 'A.Y.I Shada Shoprite',
      frequency: 3
    },
    {
      accountNumber: '1123456987',
      bankName: 'PalmPay',
      accountName: 'John Doe Enterprises',
      frequency: 2
    }
  ]);

  // Action strip state
  const [actions] = useState([
    {
      id: 'airtime',
      title: 'Airtime',
      onPress: () => {
        console.log('Airtime pressed');
        // Mock airtime action
      },
      active: false,
    },
    {
      id: 'data',
      title: 'Data',
      onPress: () => {
        console.log('Data pressed');
        // Mock data action
      },
      active: false,
    }
  ]);

  // Location watching state
  const [isLocationWatching, setIsLocationWatching] = useState(false);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastKnownLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const locationCheckInProgressRef = useRef(false);

  // Backend checks state
  const [backendChecksStarted, setBackendChecksStarted] = useState(false);
  const [backendUnavailableToastShown, setBackendUnavailableToastShown] = useState(false);
  const [delayTimerComplete, setDelayTimerComplete] = useState(false);

  // Use custom hooks for logic separation
  const cameraLogic = useCameraLogic();

  // Initialize backend checks
  const backendChecks = useBackendChecks({
    enabled: backendChecksStarted,
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
      <StatusBar barStyle="light-content" backgroundColor="#FF0000" />
      
      {/* Header Card with Camera Interface */}
      <HeaderCard
        actions={actions}
        // Camera interface props
        cameraRef={cameraLogic.cameraRef}
        cameraType={cameraLogic.cameraType}
        zoom={cameraLogic.zoom}
        flashMode={cameraLogic.flashMode}
        zoomAnimation={cameraLogic.zoomAnimation}
        showInstructions={cameraLogic.showInstructions}
        instructionAnimation={cameraLogic.instructionAnimation}
        isCapturing={cameraLogic.isCapturing}
        isProcessing={cameraLogic.isProcessing}
        dimViewfinderRings={false}
        isAppInBackground={cameraLogic.isAppInBackground}
        onZoomChange={cameraLogic.handleZoomChange}
        onToggleFlash={cameraLogic.toggleFlash}
        onCapture={cameraLogic.handleCapture}
        onOpenGallery={cameraLogic.openGallery}
        onViewHistory={cameraLogic.handleViewHistory}
        isConnectionDisabled={!cameraLogic.areAllChecksComplete || !backendChecks.isAuthenticated || !backendChecks.kycStatus?.isVerified}
        showTransactionHistory={cameraLogic.showTransactionHistory}
        transactions={cameraLogic.transactionsData.transactions}
        onTransactionPress={(transaction: Transaction) => {
          console.log('Transaction pressed:', transaction);
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
        }}
      />

      {/* Dark Bottom Overlay Card */}
      <View style={styles.bottomCard}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        {/* Suggestion Strip */}
        <SuggestionStrip
          suggestions={suggestions}
          onSuggestionPress={(suggestion) => {
            console.log('Suggestion pressed:', suggestion);
            setShowSuggestions(false);
          }}
          onClose={() => setShowSuggestions(false)}
          visible={showSuggestions}
        />

        {/* Banner - Show when suggestions are not visible */}
        <Banner
          title="🎉 Special Offer!"
          subtitle="Get 20% off your next transfer"
          onPress={() => console.log('Banner pressed')}
          onClose={() => console.log('Banner closed')}
          visible={!showSuggestions}
          backgroundColor="#FFE66C"
          textColor="#000"
        />

        {/* Camera Controls - Use actual CameraControls component */}
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
          isConnectionDisabled={!cameraLogic.areAllChecksComplete || !backendChecks.isAuthenticated || !backendChecks.kycStatus?.isVerified}
          showTransactionHistory={cameraLogic.showTransactionHistory}
          transactions={cameraLogic.transactionsData.transactions}
          onTransactionPress={(transaction: Transaction) => {
            console.log('Transaction pressed:', transaction);
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
          }}
        />


        {/* Swipe Indicator */}
        <Text style={styles.swipeIndicator}>⌃</Text>
      </View>


      {/* Location Floating Button - Always visible for authenticated and verified users */}
      {backendChecks.isAuthenticated && backendChecks.kycStatus?.isVerified && (
        <LocationFloatingButton
          isLoading={isLocationButtonLoading}
          onPress={async () => {
            console.log('📍 [DevPreview] Location button pressed');
            setShowLocationSuggestion(true);
          }}
        />
      )}

      {/* Keyboard Floating Button - Right Side - For manual bank entry */}
      {backendChecks.isAuthenticated && backendChecks.kycStatus?.isVerified && (
        <FloatingButton
          icon={<Image source={require('../assets/icons/home/keyboard.png')} style={{ width: 24, height: 24 }} />}
          onPress={() => {
            console.log('⌨️ [DevPreview] Keyboard button pressed');
            cameraLogic.handleManualBankTransfer();
          }}
          hapticFeedback="light"
          style={{
            position: 'absolute',
            bottom: 40,
            right: 25,
            backgroundColor: 'rgba(0, 0, 0, 0.28)',
            zIndex: 9999,
            elevation: 9999,
          }}
        />
      )}


      {/* Blur overlay when app is in background for privacy */}
      {cameraLogic.isAppInBackground && (
        <BlurView
          intensity={100}
          tint="dark"
          style={styles.blurOverlay}
        >
          <View style={styles.splashOverlay}>
            <Image 
              source={require('../assets/splash/splash.png')}
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

      {/* All Modals */}
      <CameraModals
        showBankTransferModal={cameraLogic.showBankTransferModal}
        showManualBankTransferModal={cameraLogic.showManualBankTransferModal}
        showVerificationModal={cameraLogic.showVerificationModal}
        showSetPinModal={cameraLogic.showSetPinModal}
        extractedData={cameraLogic.extractedData}
        capturedImageUri={cameraLogic.capturedImageUri}
        isWalletActivationMode={cameraLogic.isWalletActivationMode}
        isPendingVerification={cameraLogic.isPendingVerification}
        walletRecoveryPending={cameraLogic.walletRecoveryMutation.isPending}
        onBankModalClose={cameraLogic.handleBankModalClose}
        onManualBankModalClose={cameraLogic.handleBankModalClose}
        onBankModalConfirm={cameraLogic.handleBankModalConfirm}
        onBankModalSuccess={cameraLogic.handleBankModalSuccess}
        onVerificationModalClose={cameraLogic.handleVerificationModalClose}
        onVerifyID={cameraLogic.handleVerifyID}
        onSetPinModalClose={cameraLogic.handleSetPinModalClose}
        onSetPinSuccess={cameraLogic.handleSetPinSuccess}
      />

      {/* Location Suggestion Modal */}
      <LocationSuggestionModal
        visible={showLocationSuggestion}
        preFetchedData={locationPaymentData}
        onClose={() => {
          setShowLocationSuggestion(false);
          setLocationPaymentData(null);
        }}
        onSuggestionSelected={(suggestion) => {
          console.log('📍 [DevPreview] Location suggestion selected:', suggestion);
          setShowLocationSuggestion(false);
          router.push({
            pathname: '/transfer',
            params: {
              bankName: suggestion.bankName,
              accountNumber: suggestion.accountNumber,
              accountHolderName: suggestion.accountName,
              transferSource: 'suggestion_modal',
            }
          });
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  // Dark Bottom Overlay Card
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: '#000000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 20, // Lower than headerCard
    paddingTop: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  closeIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: fontFamilies.sora.semiBold,
  },
  swipeIndicator: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 10,
  },
  // Legacy styles for compatibility
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
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
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 999,
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
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});
