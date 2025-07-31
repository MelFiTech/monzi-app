import { useState, useEffect, useCallback, useRef } from 'react';
import WebSocketService, { 
  ProximityResult, 
  NearbyPaymentLocation, 
  WebSocketError, 
  AutoSubscriptionData,
  LocationSubscription 
} from '@/services/WebSocketService';
import LocationSettingsService from '@/services/LocationSettingsService';
import LocationService from '@/services/LocationService';
import AuthStorageService from '@/services/AuthStorageService';

export interface UseWebSocketLocationServiceOptions {
  autoConnect?: boolean;
  autoStartLocationUpdates?: boolean;
  locationUpdateFrequency?: number; // in seconds
  proximityRadius?: number; // in meters
}

export interface UseWebSocketLocationServiceReturn {
  // WebSocket Status
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Location Settings
  locationNotificationsEnabled: boolean;
  isLoadingSettings: boolean;
  
  // Location Updates
  isLocationTrackingActive: boolean;
  lastLocationUpdate: any;
  locationUpdateCount: number;
  
  // Events
  proximityResults: ProximityResult[];
  nearbyPaymentLocations: NearbyPaymentLocation[];
  locationErrors: WebSocketError[];
  
  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => void;
  startLocationTracking: () => Promise<boolean>;
  stopLocationTracking: () => void;
  toggleLocationNotifications: () => Promise<boolean>;
  enableLocationNotifications: () => Promise<boolean>;
  disableLocationNotifications: () => Promise<boolean>;
  sendManualLocationUpdate: () => Promise<void>;
  
  // Manual Subscription Control
  subscribeToLocationTracking: (subscription: Omit<LocationSubscription, 'userId'>) => void;
}

export function useWebSocketLocationService(
  options: UseWebSocketLocationServiceOptions = {}
): UseWebSocketLocationServiceReturn {
  const {
    autoConnect = true,
    autoStartLocationUpdates = false,
    locationUpdateFrequency = 35,
    proximityRadius = 40,
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [locationNotificationsEnabled, setLocationNotificationsEnabled] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLocationTrackingActive, setIsLocationTrackingActive] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<any>(null);
  const [locationUpdateCount, setLocationUpdateCount] = useState(0);
  const [proximityResults, setProximityResults] = useState<ProximityResult[]>([]);
  const [nearbyPaymentLocations, setNearbyPaymentLocations] = useState<NearbyPaymentLocation[]>([]);
  const [locationErrors, setLocationErrors] = useState<WebSocketError[]>([]);

  // Refs
  const webSocketService = useRef(WebSocketService.getInstance());
  const locationSettingsService = useRef(LocationSettingsService.getInstance());
  const locationService = useRef(LocationService.getInstance());
  const authService = useRef(AuthStorageService.getInstance());
  const userId = useRef<string | null>(null);

  // Initialize user ID
  useEffect(() => {
    const initUserId = async () => {
      try {
        const user = await authService.current.getUser();
        userId.current = user?.id || null;
      } catch (error) {
        console.error('❌ Error getting user ID:', error);
      }
    };
    
    initUserId();
  }, []);

  // Load location settings
  useEffect(() => {
    const loadLocationSettings = async () => {
      if (!userId.current) return;
      
      setIsLoadingSettings(true);
      try {
        const settings = await locationSettingsService.current.getLocationNotificationSettings(userId.current);
        setLocationNotificationsEnabled(settings?.locationNotificationsEnabled ?? false);
      } catch (error) {
        console.error('❌ Error loading location settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadLocationSettings();
  }, [userId.current]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && userId.current && !isConnected && !isConnecting) {
      connect();
    }
  }, [autoConnect, userId.current, isConnected, isConnecting]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const wsService = webSocketService.current;

    const handleConnected = () => {
      console.log('✅ WebSocket connected via hook');
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
    };

    const handleDisconnected = (data: any) => {
      console.log('🔌 WebSocket disconnected via hook:', data);
      setIsConnected(false);
      setIsConnecting(false);
      setIsLocationTrackingActive(false);
    };

    const handleError = (error: WebSocketError) => {
      console.error('❌ WebSocket error via hook:', error);
      setConnectionError(error.message);
      setLocationErrors(prev => [error, ...prev.slice(0, 9)]); // Keep last 10 errors
    };

    const handleProximityResult = (data: ProximityResult) => {
      console.log('🎯 Proximity result via hook:', data);
      setProximityResults(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 results
    };

    const handleNearbyPaymentLocation = (data: NearbyPaymentLocation) => {
      console.log('💳 Nearby payment location via hook:', data);
      setNearbyPaymentLocations(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 locations
    };

    const handleAutoSubscription = (data: AutoSubscriptionData) => {
      console.log('✅ Auto-subscription via hook:', data);
      if (data.enabled && autoStartLocationUpdates) {
        startLocationTracking();
      }
    };

    const handleLocationError = (error: WebSocketError) => {
      console.error('❌ Location error via hook:', error);
      setLocationErrors(prev => [error, ...prev.slice(0, 9)]); // Keep last 10 errors
      
      if (error.type === 'LOCATION_NOTIFICATIONS_DISABLED') {
        setIsLocationTrackingActive(false);
      }
    };

    // Add event listeners
    wsService.on('connected', handleConnected);
    wsService.on('disconnected', handleDisconnected);
    wsService.on('error', handleError);
    wsService.on('proximity_result', handleProximityResult);
    wsService.on('nearby_payment_location', handleNearbyPaymentLocation);
    wsService.on('auto_subscribed', handleAutoSubscription);
    wsService.on('location_error', handleLocationError);

    // Cleanup
    return () => {
      wsService.off('connected', handleConnected);
      wsService.off('disconnected', handleDisconnected);
      wsService.off('error', handleError);
      wsService.off('proximity_result', handleProximityResult);
      wsService.off('nearby_payment_location', handleNearbyPaymentLocation);
      wsService.off('auto_subscribed', handleAutoSubscription);
      wsService.off('location_error', handleLocationError);
    };
  }, [autoStartLocationUpdates]);

  // Update connection status from WebSocket service
  useEffect(() => {
    const updateConnectionStatus = () => {
      const status = webSocketService.current.getConnectionStatus();
      setIsConnected(status.isConnected);
      setIsConnecting(status.isConnecting);
    };

    updateConnectionStatus();
    const interval = setInterval(updateConnectionStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    if (!userId.current) {
      console.error('❌ Cannot connect: no user ID');
      return false;
    }

    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const success = await webSocketService.current.connect();
      return success;
    } catch (error) {
      console.error('❌ Error connecting to WebSocket:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback((): void => {
    webSocketService.current.disconnect();
  }, []);

  const startLocationTracking = useCallback(async (): Promise<boolean> => {
    if (!isConnected) {
      console.error('❌ Cannot start location tracking: WebSocket not connected');
      return false;
    }

    if (!locationNotificationsEnabled) {
      console.error('❌ Cannot start location tracking: notifications disabled');
      return false;
    }

    try {
      // Start location updates
      webSocketService.current.startLocationUpdates(locationUpdateFrequency);
      setIsLocationTrackingActive(true);
      console.log('✅ Location tracking started');
      return true;
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      return false;
    }
  }, [isConnected, locationNotificationsEnabled, locationUpdateFrequency]);

  const stopLocationTracking = useCallback((): void => {
    webSocketService.current.stopLocationUpdates();
    setIsLocationTrackingActive(false);
    console.log('🛑 Location tracking stopped');
  }, []);

  const toggleLocationNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId.current) {
      console.error('❌ Cannot toggle notifications: no user ID');
      return false;
    }

    try {
      const success = await locationSettingsService.current.toggleLocationNotifications(userId.current);
      if (success) {
        setLocationNotificationsEnabled(prev => !prev);
      }
      return success;
    } catch (error) {
      console.error('❌ Error toggling location notifications:', error);
      return false;
    }
  }, []);

  const enableLocationNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId.current) {
      console.error('❌ Cannot enable notifications: no user ID');
      return false;
    }

    try {
      const success = await locationSettingsService.current.enableLocationNotifications(userId.current);
      if (success) {
        setLocationNotificationsEnabled(true);
      }
      return success;
    } catch (error) {
      console.error('❌ Error enabling location notifications:', error);
      return false;
    }
  }, []);

  const disableLocationNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId.current) {
      console.error('❌ Cannot disable notifications: no user ID');
      return false;
    }

    try {
      const success = await locationSettingsService.current.disableLocationNotifications(userId.current);
      if (success) {
        setLocationNotificationsEnabled(false);
        stopLocationTracking();
      }
      return success;
    } catch (error) {
      console.error('❌ Error disabling location notifications:', error);
      return false;
    }
  }, [stopLocationTracking]);

  const sendManualLocationUpdate = useCallback(async (): Promise<void> => {
    if (!isConnected) {
      console.error('❌ Cannot send location update: WebSocket not connected');
      return;
    }

    try {
      const location = await locationService.current.getCurrentLocation();
      if (location) {
        webSocketService.current.sendLocationUpdate({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: 10,
          speed: 0,
          heading: 0,
          altitude: 0
        });
        
        setLastLocationUpdate(location);
        setLocationUpdateCount(prev => prev + 1);
        console.log('📍 Manual location update sent');
      } else {
        console.error('❌ Could not get current location');
      }
    } catch (error) {
      console.error('❌ Error sending manual location update:', error);
    }
  }, [isConnected]);

  const subscribeToLocationTracking = useCallback((
    subscription: Omit<LocationSubscription, 'userId'>
  ): void => {
    if (!isConnected) {
      console.error('❌ Cannot subscribe: WebSocket not connected');
      return;
    }

    webSocketService.current.subscribeToLocationTracking(subscription);
  }, [isConnected]);

  return {
    // WebSocket Status
    isConnected,
    isConnecting,
    connectionError,
    
    // Location Settings
    locationNotificationsEnabled,
    isLoadingSettings,
    
    // Location Updates
    isLocationTrackingActive,
    lastLocationUpdate,
    locationUpdateCount,
    
    // Events
    proximityResults,
    nearbyPaymentLocations,
    locationErrors,
    
    // Actions
    connect,
    disconnect,
    startLocationTracking,
    stopLocationTracking,
    toggleLocationNotifications,
    enableLocationNotifications,
    disableLocationNotifications,
    sendManualLocationUpdate,
    
    // Manual Subscription Control
    subscribeToLocationTracking,
  };
} 