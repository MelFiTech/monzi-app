import * as Location from 'expo-location';
import { getApiBaseUrl } from '@/constants/config';
import AuthStorageService from './AuthStorageService';
import PushNotificationService from './PushNotificationService';

export interface PaymentSuggestion {
  accountNumber: string;
  bankName: string;
  accountName: string;
  frequency: number;
}

export interface LocationMatch {
  locationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  confidence: number;
  paymentSuggestions: PaymentSuggestion[];
}

export interface PreciseLocationResponse {
  success: boolean;
  message: string;
  data: {
    match: LocationMatch | null;
    suggestions: LocationMatch[];
  };
}

export interface NearbyLocationResponse {
  success: boolean;
  message: string;
  data: {
    locations: LocationMatch[];
    total: number;
  };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface GeofenceArea {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  paymentSuggestions: PaymentSuggestion[];
}

export interface BackgroundLocationConfig {
  enabled: boolean;
  updateInterval: number; // in milliseconds
  distanceThreshold: number; // in meters
  geofenceRadius: number; // in meters
}

class LocationService {
  private static instance: LocationService;
  private backgroundLocationTask: any = null;
  private geofenceAreas: GeofenceArea[] = [];
  private isBackgroundMonitoring = false;
  private lastKnownLocation: LocationData | null = null;
  private locationUpdateCallback?: (location: LocationData) => void;
  private geofenceEnterCallback?: (area: GeofenceArea) => void;
  private geofenceExitCallback?: (area: GeofenceArea) => void;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions (foreground and background)
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      console.log('📍 Requesting foreground location permission...');
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus === 'granted') {
        console.log('✅ Foreground location permission granted');
        return true;
      } else {
        console.log('❌ Foreground location permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Request background location permission separately
   * This should be called when user explicitly enables background features
   */
  async requestBackgroundLocationPermission(): Promise<boolean> {
    try {
      console.log('📍 Requesting background location permission for geofencing and notifications...');
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus === 'granted') {
        console.log('✅ Background location permission granted');
        return true;
      } else {
        console.log('❌ Background location permission denied - background features will be disabled');
        return false;
      }
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      return false;
    }
  }

  /**
   * Check if background location permission is granted
   */
  async checkBackgroundLocationPermission(): Promise<boolean> {
    try {
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      return backgroundStatus === 'granted';
    } catch (error) {
      console.error('Error checking background location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permission is granted
   */
  async checkLocationPermission(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      
      // For now, just check foreground permission
      // Background permission can be requested separately when needed
      return foregroundStatus === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      this.lastKnownLocation = locationData;
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start background location monitoring
   */
  async startBackgroundLocationMonitoring(config: BackgroundLocationConfig): Promise<boolean> {
    try {
      // First check foreground permission
      const hasForegroundPermission = await this.checkLocationPermission();
      if (!hasForegroundPermission) {
        console.error('Foreground location permission not granted');
        return false;
      }

      // Then check background permission
      const hasBackgroundPermission = await this.checkBackgroundLocationPermission();
      if (!hasBackgroundPermission) {
        console.log('📍 Background permission not granted, requesting for geofencing...');
        const backgroundGranted = await this.requestBackgroundLocationPermission();
        if (!backgroundGranted) {
          console.log('⚠️ Background location features will be disabled - user can enable later in settings');
          return false;
        }
      }

      if (this.isBackgroundMonitoring) {
        console.log('Background location monitoring already active');
        return true;
      }

      // Stop any existing task
      await this.stopBackgroundLocationMonitoring();

      // Start background location updates
      this.backgroundLocationTask = await Location.startLocationUpdatesAsync('background-location', {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: config.updateInterval,
        distanceInterval: config.distanceThreshold,
        foregroundService: {
          notificationTitle: "Monzi Location Tracking",
          notificationBody: "Tracking your location for payment suggestions",
          notificationColor: "#007AFF",
        },
      });

      this.isBackgroundMonitoring = true;
      console.log('✅ Background location monitoring started');
      return true;
    } catch (error) {
      console.error('❌ Error starting background location monitoring:', error);
      return false;
    }
  }

  /**
   * Stop background location monitoring
   */
  async stopBackgroundLocationMonitoring(): Promise<void> {
    try {
      if (this.backgroundLocationTask) {
        await Location.stopLocationUpdatesAsync(this.backgroundLocationTask);
        this.backgroundLocationTask = null;
      }
      this.isBackgroundMonitoring = false;
      console.log('🛑 Background location monitoring stopped');
    } catch (error) {
      console.error('❌ Error stopping background location monitoring:', error);
    }
  }

  /**
   * Set up location update callback
   */
  setLocationUpdateCallback(callback: (location: LocationData) => void): void {
    this.locationUpdateCallback = callback;
  }

  /**
   * Set up geofence enter callback
   */
  setGeofenceEnterCallback(callback: (area: GeofenceArea) => void): void {
    this.geofenceEnterCallback = callback;
  }

  /**
   * Set up geofence exit callback
   */
  setGeofenceExitCallback(callback: (area: GeofenceArea) => void): void {
    this.geofenceExitCallback = callback;
  }

  /**
   * Add geofence areas for monitoring
   */
  addGeofenceAreas(areas: GeofenceArea[]): void {
    this.geofenceAreas = [...this.geofenceAreas, ...areas];
    console.log(`📍 Added ${areas.length} geofence areas for monitoring`);
  }

  /**
   * Remove geofence areas
   */
  removeGeofenceAreas(areaIds: string[]): void {
    this.geofenceAreas = this.geofenceAreas.filter(area => !areaIds.includes(area.id));
    console.log(`🗑️ Removed ${areaIds.length} geofence areas`);
  }

  /**
   * Clear all geofence areas
   */
  clearGeofenceAreas(): void {
    this.geofenceAreas = [];
    console.log('🗑️ Cleared all geofence areas');
  }

  /**
   * Check if user is within any geofence area
   */
  checkGeofenceAreas(location: LocationData): GeofenceArea[] {
    const nearbyAreas: GeofenceArea[] = [];
    
    for (const area of this.geofenceAreas) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        area.latitude,
        area.longitude
      );
      
      if (distance <= area.radius) {
        nearbyAreas.push(area);
      }
    }
    
    return nearbyAreas;
  }

  /**
   * Handle location update from background task
   */
  async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    const locationData: LocationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    this.lastKnownLocation = locationData;
    console.log('📍 Background location update:', locationData);

    // Check geofence areas
    const nearbyAreas = this.checkGeofenceAreas(locationData);
    
    if (nearbyAreas.length > 0) {
      console.log(`🎯 User entered ${nearbyAreas.length} geofence area(s)`);
      
      for (const area of nearbyAreas) {
        // Trigger geofence enter callback
        if (this.geofenceEnterCallback) {
          this.geofenceEnterCallback(area);
        }
        
        // Send push notification
        await this.sendPaymentLocationNotification(area);
      }
    }

    // Call location update callback
    if (this.locationUpdateCallback) {
      this.locationUpdateCallback(locationData);
    }
  }

  /**
   * Send push notification for payment location
   */
  async sendPaymentLocationNotification(area: GeofenceArea): Promise<void> {
    try {
      // For now, just log the notification since PushNotificationService doesn't have sendLocalNotification
      console.log('📱 Payment location notification would be sent for:', area.name);
      console.log('📱 Notification data:', {
        title: `Payment Available Nearby`,
        body: `Payment details available at ${area.name}`,
        data: {
          type: 'payment_location',
          areaId: area.id,
          areaName: area.name,
          paymentSuggestions: area.paymentSuggestions,
        },
      });
      
      // TODO: Implement local notification sending when PushNotificationService supports it
    } catch (error) {
      console.error('❌ Error sending payment location notification:', error);
    }
  }

  /**
   * Get nearby payment locations from backend
   */
  async getNearbyPaymentLocations(latitude: number, longitude: number, radius: number = 1000): Promise<LocationMatch[]> {
    try {
      const baseUrl = getApiBaseUrl();
      const authService = AuthStorageService.getInstance();
      const token = await authService.getAccessToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${baseUrl}/locations/payment-areas?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: NearbyLocationResponse = await response.json();
      
      if (result.success && result.data) {
        return result.data.locations || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting nearby payment locations:', error);
      return [];
    }
  }

  /**
   * Update geofence areas from backend
   */
  async updateGeofenceAreasFromBackend(): Promise<void> {
    try {
      if (!this.lastKnownLocation) {
        console.log('📍 No last known location, skipping geofence update');
        return;
      }

      const paymentLocations = await this.getNearbyPaymentLocations(
        this.lastKnownLocation.latitude,
        this.lastKnownLocation.longitude,
        5000 // 5km radius
      );

      const geofenceAreas: GeofenceArea[] = paymentLocations.map(location => ({
        id: location.locationId,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 200, // 200m radius for payment areas
        paymentSuggestions: location.paymentSuggestions,
      }));

      this.addGeofenceAreas(geofenceAreas);
      console.log(`📍 Updated ${geofenceAreas.length} geofence areas from backend`);
    } catch (error) {
      console.error('❌ Error updating geofence areas from backend:', error);
    }
  }

  /**
   * Get precise location suggestions for a specific business
   */
  async getPreciseLocationSuggestions(
    latitude: number,
    longitude: number,
    businessName: string
  ): Promise<LocationMatch | null> {
    try {
      const baseUrl = getApiBaseUrl();
      const authService = AuthStorageService.getInstance();
      const token = await authService.getAccessToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${baseUrl}/locations/suggestions/precise?latitude=${latitude}&longitude=${longitude}&name=${encodeURIComponent(businessName)}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: PreciseLocationResponse = await response.json();
      
      if (result.success && result.data) {
        return result.data.match;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting precise location suggestions:', error);
      return null;
    }
  }

  /**
   * Get nearby location suggestions
   */
  async getNearbyLocationSuggestions(
    latitude: number,
    longitude: number,
    radius: number = 1000
  ): Promise<LocationMatch[]> {
    try {
      const baseUrl = getApiBaseUrl();
      const authService = AuthStorageService.getInstance();
      const token = await authService.getAccessToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${baseUrl}/locations/suggestions/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: NearbyLocationResponse = await response.json();
      
      if (result.success && result.data) {
        return result.data.locations || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting nearby location suggestions:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get background monitoring status
   */
  isBackgroundMonitoringActive(): boolean {
    return this.isBackgroundMonitoring;
  }

  /**
   * Get last known location
   */
  getLastKnownLocation(): LocationData | null {
    return this.lastKnownLocation;
  }

  /**
   * Get current geofence areas
   */
  getGeofenceAreas(): GeofenceArea[] {
    return [...this.geofenceAreas];
  }
}

export default LocationService; 