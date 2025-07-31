import { getApiBaseUrl } from '@/constants/config';
import AuthStorageService from './AuthStorageService';
import { LocationSettings } from './WebSocketService';

export interface LocationSettingsResponse {
  success: boolean;
  message: string;
  data: LocationSettings;
}

export interface UpdateLocationSettingsRequest {
  enabled: boolean;
}

export interface UpdateLocationSettingsResponse {
  success: boolean;
  message: string;
  data: LocationSettings;
}

class LocationSettingsService {
  private static instance: LocationSettingsService;

  private constructor() {}

  public static getInstance(): LocationSettingsService {
    if (!LocationSettingsService.instance) {
      LocationSettingsService.instance = new LocationSettingsService();
    }
    return LocationSettingsService.instance;
  }

  /**
   * Get current location notification settings for a user
   */
  async getLocationNotificationSettings(userId: string): Promise<LocationSettings | null> {
    try {
      const baseUrl = getApiBaseUrl();
      const authService = AuthStorageService.getInstance();
      const token = await authService.getAccessToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      };

      const response = await fetch(
        `${baseUrl}/locations/settings/location-notifications/${userId}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log('📍 No location settings found for user, returning default');
          return this.getDefaultLocationSettings(userId);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: LocationSettingsResponse = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Retrieved location notification settings:', result.data);
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting location notification settings:', error);
      return null;
    }
  }

  /**
   * Update location notification settings for a user
   */
  async updateLocationNotificationSettings(
    userId: string, 
    enabled: boolean
  ): Promise<LocationSettings | null> {
    try {
      const baseUrl = getApiBaseUrl();
      const authService = AuthStorageService.getInstance();
      const token = await authService.getAccessToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      };

      const requestBody: UpdateLocationSettingsRequest = {
        enabled
      };

      const response = await fetch(
        `${baseUrl}/locations/settings/location-notifications/${userId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: UpdateLocationSettingsResponse = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Updated location notification settings:', result.data);
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error updating location notification settings:', error);
      return null;
    }
  }

  /**
   * Toggle location notifications on/off
   */
  async toggleLocationNotifications(userId: string): Promise<boolean> {
    try {
      // Get current settings
      const currentSettings = await this.getLocationNotificationSettings(userId);
      if (!currentSettings) {
        console.error('❌ Could not retrieve current location settings');
        return false;
      }

      // Toggle the enabled state
      const newEnabled = !currentSettings.locationNotificationsEnabled;
      
      // Update settings
      const updatedSettings = await this.updateLocationNotificationSettings(userId, newEnabled);
      
      if (updatedSettings) {
        console.log(`✅ Location notifications ${newEnabled ? 'enabled' : 'disabled'}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error toggling location notifications:', error);
      return false;
    }
  }

  /**
   * Enable location notifications
   */
  async enableLocationNotifications(userId: string): Promise<boolean> {
    try {
      const settings = await this.updateLocationNotificationSettings(userId, true);
      return settings !== null;
    } catch (error) {
      console.error('❌ Error enabling location notifications:', error);
      return false;
    }
  }

  /**
   * Disable location notifications
   */
  async disableLocationNotifications(userId: string): Promise<boolean> {
    try {
      const settings = await this.updateLocationNotificationSettings(userId, false);
      return settings !== null;
    } catch (error) {
      console.error('❌ Error disabling location notifications:', error);
      return false;
    }
  }

  /**
   * Get default location settings for a user
   */
  private getDefaultLocationSettings(userId: string): LocationSettings {
    return {
      userId,
      locationNotificationsEnabled: false,
      updateFrequency: 35, // 35 seconds
      proximityRadius: 40, // 40 meters
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Check if location notifications are enabled for a user
   */
  async areLocationNotificationsEnabled(userId: string): Promise<boolean> {
    try {
      const settings = await this.getLocationNotificationSettings(userId);
      return settings?.locationNotificationsEnabled ?? false;
    } catch (error) {
      console.error('❌ Error checking location notification status:', error);
      return false;
    }
  }
}

export default LocationSettingsService; 