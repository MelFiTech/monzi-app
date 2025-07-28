import * as Location from 'expo-location';
import { getApiBaseUrl } from '@/constants/config';
import AuthStorageService from './AuthStorageService';

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

class LocationService {
  private static instance: LocationService;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permission is granted
   */
  async checkLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
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

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
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
}

export default LocationService; 