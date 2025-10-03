import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { PulsatingGlow, Transaction, LocationSuggestionModal, LocationFloatingButton, FloatingButton, ActionStrip, Pill, SuggestionStrip, HeaderCard, Banner } from '@/components/common';
import { FontAwesome } from '@expo/vector-icons';
import { CameraPermissions, CameraInterface, CameraControls, CameraModals, ExtractionLoader } from '@/components/camera';
import { useCameraLogic } from '@/hooks/useCameraLogic';
import { useBackendChecks } from '@/hooks/useBackendChecks';
import { useNotificationService } from '@/hooks/useNotificationService';
import { usePushNotificationService } from '@/hooks/usePushNotificationService';
import { useWebSocketCacheIntegration } from '@/hooks/useWalletService';
import { useGetCurrentLocation, usePreciseLocationSuggestions, useNearbyLocationSuggestions } from '@/hooks/useLocationService';
import { PaymentSuggestion } from '@/services/LocationService';
import { useWebSocketLocationService } from '@/hooks/useWebSocketLocationService';
import { fontFamilies } from '@/constants/fonts';
import ToastService from '@/services/ToastService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const { logout, user, authToken } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const queryClient = useQueryClient();

  // Location suggestion state
  const [showLocationSuggestion, setShowLocationSuggestion] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPaymentData, setLocationPaymentData] = useState<any>(null); // Pre-fetched payment data
  const [isLocationButtonLoading, setIsLocationButtonLoading] = useState(false);
  const getLocationMutation = useGetCurrentLocation();

  // Get precise location suggestions (when business name is provided)
  const {
    data: preciseMatch,
    isLoading: isPreciseLoading,
    error: preciseError,
  } = usePreciseLocationSuggestions(
    currentLocation?.latitude || null,
    currentLocation?.longitude || null,
    'Business' // Default business name
  );

  // Get nearby location suggestions (when no business name is provided)
  const {
    data: nearbyLocations,
    isLoading: isNearbyLoading,
    error: nearbyError,
  } = useNearbyLocationSuggestions(
    currentLocation?.latitude || null,
    currentLocation?.longitude || null,
    1000 // 1km radius
  );

  // Suggestion strip state
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestions, setSuggestions] = useState<PaymentSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);


  // Action strip state - using useMemo to ensure actions are reactive
  const actions = useMemo(() => [
    {
      id: 'airtime',
      title: 'Airtime',
      iconName: 'phone' as keyof typeof FontAwesome.glyphMap,
      onPress: () => {
        console.log('🎯 Airtime pressed - Opening airtime modal');
        router.push('/airtime-modal');
      },
      active: false,
    },
    {
      id: 'data',
      title: 'Data',
      iconName: 'wifi' as keyof typeof FontAwesome.glyphMap,
      onPress: () => {
        console.log('🎯 Data pressed - Opening data modal');
        router.push('/data-modal');
      },
      active: false,
    }
  ], []);

  // Location watching state
  const [isLocationWatching, setIsLocationWatching] = useState(false);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastKnownLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const locationCheckInProgressRef = useRef(false);

  // Backend checks state
  const [backendChecksStarted, setBackendChecksStarted] = useState(false);
  const [backendUnavailableToastShown, setBackendUnavailableToastShown] = useState(false);
  const [delayTimerComplete, setDelayTimerComplete] = useState(false);

  // Wallet data will be handled by backend checks when KYC is verified

  // Use custom hooks for logic separation
  const cameraLogic = useCameraLogic();

  // Process location suggestions for suggestion strip
  useEffect(() => {
    // Extract payment suggestions from locations
    const preciseSuggestions = preciseMatch?.paymentSuggestions || [];
    const nearbySuggestions = nearbyLocations?.flatMap(location => location.paymentSuggestions) || [];
    
    // Use precise suggestions if available, otherwise use nearby suggestions
    const allSuggestions = preciseSuggestions.length > 0 ? preciseSuggestions : nearbySuggestions;
    
    // Update suggestions state
    setSuggestions(allSuggestions);
    setIsLoadingSuggestions(isPreciseLoading || isNearbyLoading);
    
    console.log('📍 [CameraScreen] Suggestions updated:', {
      preciseCount: preciseSuggestions.length,
      nearbyCount: nearbySuggestions.length,
      totalCount: allSuggestions.length,
      isLoading: isPreciseLoading || isNearbyLoading
    });
  }, [preciseMatch, nearbyLocations, isPreciseLoading, isNearbyLoading]);

  // Initialize backend checks after delay (skip delay for fresh registration)
  useEffect(() => {
    if (!backendChecksStarted && !delayTimerComplete) {
      // Clear location modal dismissed flag on fresh app load
      AsyncStorage.removeItem('location_modal_minimized').catch(console.log);
      console.log('🔄 [CameraScreen] Fresh app load - cleared location modal dismissed flag');
      
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

  // Push notification service for handling notification taps
  const {
    isRegistered: isPushRegistered,
    hasPermissions: hasPushPermissions,
  } = usePushNotificationService(
    authToken || null,
    {
      autoRequestPermissions: true,
      showToasts: false,
      onLocationPayment: (data) => {
        console.log('📍 Location payment notification received:', data);
        
        // Do NOT auto-open modal on notification receipt
        // Only open modal when user explicitly taps the notification
        // The push notification tap handler will open the modal and pre-fill data
      }
    }
  );

  // WebSocket location service for sending location updates to backend
  const {
    isConnected: isLocationServiceConnected,
    isLocationTrackingActive,
    nearbyPaymentLocations,
    startLocationTracking,
    stopLocationTracking,
  } = useWebSocketLocationService({
    autoConnect: true,
    autoStartLocationUpdates: false, // We'll control this manually based on auth state
    locationUpdateFrequency: 30, // Send updates every 30 seconds
    proximityRadius: 40, // 40m proximity radius
  });

  // Log WebSocket location service status for debugging
  useEffect(() => {
    console.log('📍 [CameraScreen] WebSocket location service status:', {
      isConnected: isLocationServiceConnected,
      isTrackingActive: isLocationTrackingActive,
      nearbyLocations: nearbyPaymentLocations.length,
      timestamp: new Date().toISOString(),
    });
  }, [isLocationServiceConnected, isLocationTrackingActive, nearbyPaymentLocations.length]);


  // Request camera permissions on component mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Check for notification tap flag to open manual modal
  useEffect(() => {
    const checkForNotificationTap = async () => {
      try {
        const shouldOpen = await AsyncStorage.getItem('should_open_manual_modal');
        if (shouldOpen === 'true') {
          console.log('📱 Opening manual modal from notification tap');
          cameraLogic.setShowManualBankTransferModal(true);
          // Clear the flag
          await AsyncStorage.removeItem('should_open_manual_modal');
        }
      } catch (error) {
        console.error('❌ Error checking notification tap flag:', error);
      }
    };

    checkForNotificationTap();
  }, []); // Run once on mount

  // Helper function to check if location has changed significantly
  const hasLocationChangedSignificantly = (newLocation: { latitude: number; longitude: number }, oldLocation: { latitude: number; longitude: number } | null) => {
    if (!oldLocation) return true;
    
    // Calculate distance between locations (in meters)
    const R = 6371e3; // Earth's radius in meters
    const φ1 = oldLocation.latitude * Math.PI / 180;
    const φ2 = newLocation.latitude * Math.PI / 180;
    const Δφ = (newLocation.latitude - oldLocation.latitude) * Math.PI / 180;
    const Δλ = (newLocation.longitude - oldLocation.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Consider location changed if distance is more than 50 meters
    return distance > 50;
  };

  // Check for minimized state on app load


  // Function to start location watching
  const startLocationWatching = async () => {
    if (isLocationWatching || locationWatcherRef.current) {
      console.log('📍 [CameraScreen] Location watching already active');
      return;
    }

    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('📍 [CameraScreen] Location permission denied');
        return;
      }

      console.log('📍 [CameraScreen] Starting location watching...');
      setIsLocationWatching(true);

      // Start watching location with high accuracy
      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Check every 10 seconds
          distanceInterval: 50, // Update when moved 50 meters
        },
        async (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          // Check if location has changed significantly
          if (hasLocationChangedSignificantly(newLocation, lastKnownLocationRef.current)) {
            console.log('📍 [CameraScreen] Location changed significantly:', newLocation);
            
            // Prevent multiple simultaneous checks
            if (locationCheckInProgressRef.current) {
              console.log('📍 [CameraScreen] Location check already in progress, skipping');
              return;
            }

            locationCheckInProgressRef.current = true;
            lastKnownLocationRef.current = newLocation;

            try {
              // Check for payment details at new location
              const LocationService = (await import('@/services/LocationService')).default;
              const locationService = LocationService.getInstance();
              const preciseMatch = await locationService.getPreciseLocationSuggestions(
                newLocation.latitude,
                newLocation.longitude,
                'Unknown'
              );

              // Update suggestion strip with payment details
              if (preciseMatch && preciseMatch.paymentSuggestions && preciseMatch.paymentSuggestions.length > 0) {
                // Store new location
                await AsyncStorage.setItem('last_location', JSON.stringify(newLocation));
                setCurrentLocation(newLocation);
                setSuggestions(preciseMatch.paymentSuggestions);
                setShowSuggestions(true);
                console.log('📍 [CameraScreen] Location change: Payment details found and suggestion strip shown');
              } else {
                console.log('📍 [CameraScreen] Location change: No payment details available');
                setSuggestions([]);
                setShowSuggestions(false);
              }
            } catch (error) {
              console.log('⚠️ [CameraScreen] Location change check failed:', error);
            } finally {
              locationCheckInProgressRef.current = false;
            }
          }
        }
      );

      console.log('📍 [CameraScreen] Location watching started successfully');
    } catch (error) {
      console.log('❌ [CameraScreen] Failed to start location watching:', error);
      setIsLocationWatching(false);
    }
  };

  // Function to stop location watching
  const stopLocationWatching = async () => {
    if (locationWatcherRef.current) {
      await locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
      setIsLocationWatching(false);
      console.log('📍 [CameraScreen] Location watching stopped');
    }
  };

  // Location suggestion logic - Now works with suggestion strip instead of modal
  useEffect(() => {
    const checkLocationSuggestion = async () => {
      // Check location suggestions immediately after backend checks complete successfully
      // Only check location if:
      // 1. User is authenticated and verified
      // 2. All backend checks are complete (wallet details check succeeded)
      // 3. Not in KYC flow
      // 4. Not showing verification modal
      if (
        backendChecks.isAuthenticated &&
        backendChecks.kycStatus?.isVerified &&
        cameraLogic.areAllChecksComplete &&
        !cameraLogic.isInKYCFlow &&
        !cameraLogic.showVerificationModal
      ) {
        console.log('📍 [CameraScreen] Backend checks complete, checking location suggestions for strip...');
        
        try {
          // Get current location
          const location = await getLocationMutation.mutateAsync();
          
          if (location) {
            // Check if this is a new location (different from stored location)
            const storedLocation = await AsyncStorage.getItem('last_location');
            const storedLocationData = storedLocation ? JSON.parse(storedLocation) : null;
            
            const isNewLocation = !storedLocationData || 
              storedLocationData.latitude !== location.latitude || 
              storedLocationData.longitude !== location.longitude;
            
            if (isNewLocation) {
              // Store new location
              await AsyncStorage.setItem('last_location', JSON.stringify(location));
              setCurrentLocation(location);
              
              // Pre-fetch payment details for suggestion strip
              try {
                const LocationService = (await import('@/services/LocationService')).default;
                const locationService = LocationService.getInstance();
                const preciseMatch = await locationService.getPreciseLocationSuggestions(
                  location.latitude,
                  location.longitude,
                  'Unknown' // We don't have business name, so use 'Unknown'
                );
                
                // Update suggestions for strip
                const preciseSuggestions = preciseMatch?.paymentSuggestions || [];
                if (preciseSuggestions.length > 0) {
                  setSuggestions(preciseSuggestions);
                  setShowSuggestions(true);
                  console.log('📍 [CameraScreen] Payment details found and suggestion strip shown for:', location);
                } else {
                  console.log('📍 [CameraScreen] No payment details available for location:', location);
                  setSuggestions([]);
                  setShowSuggestions(false);
                }
              } catch (apiError) {
                console.log('⚠️ [CameraScreen] Failed to check payment details:', apiError);
                setSuggestions([]);
                setShowSuggestions(false);
              }
            } else {
              console.log('📍 [CameraScreen] Same location detected, not updating suggestions');
            }
          }
        } catch (error) {
          console.log('⚠️ [CameraScreen] Location suggestion failed:', error);
          // Don't show error to user, just continue without suggestion
        }
      }
    };

    // Check location immediately when conditions are met (no delay needed)
    checkLocationSuggestion();
  }, [
    backendChecks.isAuthenticated,
    backendChecks.kycStatus?.isVerified,
    cameraLogic.areAllChecksComplete,
    cameraLogic.isInKYCFlow,
    cameraLogic.showVerificationModal
  ]);

  // Start location watching when backend checks complete and user is verified
  // Now works with suggestion strip instead of modal
  useEffect(() => {
    if (
      backendChecks.isAuthenticated &&
      backendChecks.kycStatus?.isVerified &&
      cameraLogic.areAllChecksComplete &&
      !cameraLogic.isInKYCFlow &&
      !cameraLogic.showVerificationModal &&
      !isLocationWatching
    ) {
      console.log('📍 [CameraScreen] Backend checks complete, starting location watching for suggestion strip...');
      startLocationWatching();
    }
  }, [
    backendChecks.isAuthenticated,
    backendChecks.kycStatus?.isVerified,
    cameraLogic.areAllChecksComplete,
    cameraLogic.isInKYCFlow,
    cameraLogic.showVerificationModal,
    isLocationWatching
  ]);

  // Start WebSocket location tracking when user is authenticated and verified
  useEffect(() => {
    if (
      backendChecks.isAuthenticated &&
      backendChecks.kycStatus?.isVerified &&
      cameraLogic.areAllChecksComplete &&
      !cameraLogic.isInKYCFlow &&
      !cameraLogic.showVerificationModal &&
      isLocationServiceConnected &&
      !isLocationTrackingActive
    ) {
      console.log('📍 [CameraScreen] Starting WebSocket location tracking for backend notifications...');
      startLocationTracking();
    }
  }, [
    backendChecks.isAuthenticated,
    backendChecks.kycStatus?.isVerified,
    cameraLogic.areAllChecksComplete,
    cameraLogic.isInKYCFlow,
    cameraLogic.showVerificationModal,
    isLocationServiceConnected,
    isLocationTrackingActive,
    startLocationTracking
  ]);

  // Stop location watching when app goes to background or user is not verified
  // Now works with suggestion strip instead of modal
  useEffect(() => {
    if (
      !backendChecks.isAuthenticated ||
      !backendChecks.kycStatus?.isVerified ||
      cameraLogic.isInKYCFlow ||
      cameraLogic.showVerificationModal
    ) {
      stopLocationWatching();
    }
  }, [
    backendChecks.isAuthenticated,
    backendChecks.kycStatus?.isVerified,
    cameraLogic.isInKYCFlow,
    cameraLogic.showVerificationModal
  ]);

  // Stop WebSocket location tracking when user is not authenticated or verified
  useEffect(() => {
    if (
      (!backendChecks.isAuthenticated ||
      !backendChecks.kycStatus?.isVerified ||
      cameraLogic.isInKYCFlow ||
      cameraLogic.showVerificationModal) &&
      isLocationTrackingActive
    ) {
      console.log('📍 [CameraScreen] Stopping WebSocket location tracking...');
      stopLocationTracking();
    }
  }, [
    backendChecks.isAuthenticated,
    backendChecks.kycStatus?.isVerified,
    cameraLogic.isInKYCFlow,
    cameraLogic.showVerificationModal,
    isLocationTrackingActive,
    stopLocationTracking
  ]);

  // Cleanup location watching on component unmount
  // Now works with suggestion strip instead of modal
  useEffect(() => {
    return () => {
      stopLocationWatching();
      stopLocationTracking();
    };
  }, [stopLocationTracking]);



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
        dimViewfinderRings={cameraLogic.showTransactionHistory}
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

      {/* Location Floating Button - Always visible for authenticated and verified users */}
      {backendChecks.isAuthenticated && backendChecks.kycStatus?.isVerified && (
        <LocationFloatingButton
          isLoading={isLocationButtonLoading}
          onPress={async () => {
            console.log('📍 [CameraScreen] Location button pressed');
            
            try {
              // Show loading indicator immediately when button is pressed
              setIsLocationButtonLoading(true);
              
              // We want to drive the Suggestion Strip, not the modal
              setShowSuggestions(false);
              
              // Check if we have cached location data first
              const storedLocation = await AsyncStorage.getItem('last_location');
              const storedLocationData = storedLocation ? JSON.parse(storedLocation) : null;

              const ensureSuggestionsFromLocation = async (loc: { latitude: number; longitude: number }) => {
                try {
                  // Directly fetch precise suggestions for immediate UX feedback
                  const LocationService = (await import('@/services/LocationService')).default;
                  const locationService = LocationService.getInstance();
                  const preciseMatch = await locationService.getPreciseLocationSuggestions(
                    loc.latitude,
                    loc.longitude,
                    'Unknown'
                  );

                  const preciseSuggestions = preciseMatch?.paymentSuggestions || [];
                  if (preciseSuggestions.length > 0) {
                    // Populate suggestion strip and show it
                    setSuggestions(preciseSuggestions);
                    setShowSuggestions(true);
                  } else {
                    // No details for this location: brief toast and ensure banner is visible
                    ToastService.show('No details available for this location', 'info');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }
                } catch (e) {
                  console.log('⚠️ [CameraScreen] Failed to load suggestions for location:', e);
                  ToastService.show('No details available for this location', 'info');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }
              };

              if (storedLocationData) {
                console.log('📍 [CameraScreen] Using cached location data');
                setCurrentLocation(storedLocationData);
                await ensureSuggestionsFromLocation(storedLocationData);
              } else {
                // No cached data, need to get fresh location
                console.log('📍 [CameraScreen] Getting fresh location data');
                const location = await getLocationMutation.mutateAsync();
                if (location) {
                  setCurrentLocation(location);
                  await ensureSuggestionsFromLocation(location);
                } else {
                  ToastService.show('Unable to get your location', 'error');
                  setShowSuggestions(false);
                }
              }
            } catch (error) {
              console.log('Error getting location:', error);
              ToastService.show('Failed to get location', 'error');
              setShowSuggestions(false);
            } finally {
              setIsLocationButtonLoading(false);
            }
          }}
        />
      )}

      {/* Keyboard Floating Button - Right Side - For manual bank entry */}
      {backendChecks.isAuthenticated && backendChecks.kycStatus?.isVerified && (
        <FloatingButton
          icon={<Image source={require('@/assets/icons/home/keyboard.png')} style={{ width: 24, height: 24 }} />}
          onPress={() => {
            console.log('⌨️ [CameraScreen] Keyboard button pressed');
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

      {/* Suggestion Strip - Hide when transaction history is open */}
      {!cameraLogic.showTransactionHistory && (
        <SuggestionStrip
          suggestions={suggestions}
          onSuggestionPress={(suggestion) => {
            console.log('📍 [CameraScreen] Suggestion strip suggestion selected:', suggestion);
            setShowSuggestions(false);
            
            // Navigate to transfer screen with pre-filled business details
            router.push({
              pathname: '/transfer',
              params: {
                bankName: suggestion.bankName,
                accountNumber: suggestion.accountNumber,
                accountHolderName: suggestion.accountName,
                transferSource: 'suggestion_strip', // Track that this came from suggestion strip
              }
            });
          }}
          onClose={() => setShowSuggestions(false)}
          visible={showSuggestions}
          isLoading={isLoadingSuggestions}
        />
      )}

      {/* Banner - Hide when transaction history is open or show when suggestions are not visible */}
      {!cameraLogic.showTransactionHistory && (
        <Banner
          title="Refer & Earn🎉"
          subtitle="Refer your friends and get rewarded"
          onPress={() => console.log('Banner pressed')}
          onClose={() => console.log('Banner closed')}
          visible={!showSuggestions || suggestions.length === 0}
          backgroundColor="#FFE66C"
          textColor="#000000"
        />
      )}

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
          isConnectionDisabled={!cameraLogic.areAllChecksComplete || !backendChecks.isAuthenticated || !backendChecks.kycStatus?.isVerified}
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
            // Don't close modal immediately to allow toast to show
            // cameraLogic.setShowTransactionHistory(false);
          }}
        />
      )}

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
        preFetchedData={locationPaymentData} // Pass pre-fetched payment data
        onClose={() => {
          setShowLocationSuggestion(false);
          setLocationPaymentData(null); // Clear pre-fetched data when modal closes
          // Mark modal as manually dismissed to prevent auto-showing
          AsyncStorage.setItem('location_modal_minimized', 'true').catch(console.log);
          console.log('📍 [CameraScreen] Location modal manually dismissed');
        }}
        onSuggestionSelected={(suggestion) => {
          console.log('📍 [CameraScreen] Location suggestion selected:', suggestion);
          // Reset minimized state when user successfully uses a suggestion
          AsyncStorage.removeItem('location_modal_minimized').catch(console.log);
          
          // Store current location as "used" so it won't trigger again
          if (currentLocation) {
            AsyncStorage.setItem('last_location', JSON.stringify(currentLocation)).catch(console.log);
          }
          
          // Navigate to transfer screen with pre-filled business details
          router.push({
            pathname: '/transfer',
            params: {
              bankName: suggestion.bankName,
              accountNumber: suggestion.accountNumber,
              accountHolderName: suggestion.accountName,
              transferSource: 'suggestion_modal', // Track that this came from suggestion modal
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