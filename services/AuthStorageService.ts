import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from './AuthService';
import AuthService from './AuthService';

export interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  expiresIn: number;
  loginTimestamp: number;
}

export interface DeviceInfo {
  deviceId: string;
  isFirstTime: boolean;
  lastLoginTimestamp?: number;
  userCount: number; // Number of users who have logged in on this device
}

class AuthStorageService {
  private static instance: AuthStorageService;

  // Storage keys
  private readonly KEYS = {
    ACCESS_TOKEN: 'auth_access_token',
    REFRESH_TOKEN: 'auth_refresh_token',
    USER_PROFILE: 'auth_user_profile',
    AUTH_DATA: 'auth_complete_data',
    DEVICE_INFO: 'device_info',
    DEVICE_ID: 'device_id',
    BIOMETRIC_ENABLED: 'biometric_login_enabled',
    FIRST_TIME_USER: 'first_time_user',
    USER_EMAILS: 'user_emails_list', // Track users who have logged in
    LAST_LOGIN_EMAIL: 'last_login_email',
    AUTO_LOGIN_ENABLED: 'auto_login_enabled',
  };

  public static getInstance(): AuthStorageService {
    if (!AuthStorageService.instance) {
      AuthStorageService.instance = new AuthStorageService();
    }
    return AuthStorageService.instance;
  }

  /**
   * Generate or retrieve device ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(this.KEYS.DEVICE_ID);
      if (!deviceId) {
        // Generate a unique device ID
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        await SecureStore.setItemAsync(this.KEYS.DEVICE_ID, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.log('Error getting/creating device ID:', error);
      // Fallback ID
      return `device_fallback_${Date.now()}`;
    }
  }

  /**
   * Store complete authentication data
   */
  async storeAuthData(authData: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
    expiresIn: number;
  }): Promise<void> {
    try {
      const storedData: StoredAuthData = {
        ...authData,
        loginTimestamp: Date.now(),
      };

      // Store in secure storage
      await SecureStore.setItemAsync(this.KEYS.ACCESS_TOKEN, authData.accessToken);
      await SecureStore.setItemAsync(this.KEYS.REFRESH_TOKEN, authData.refreshToken);
      await SecureStore.setItemAsync(this.KEYS.AUTH_DATA, JSON.stringify(storedData));

      // Store user profile in regular storage for quick access
      await AsyncStorage.setItem(this.KEYS.USER_PROFILE, JSON.stringify(authData.user));

      // Update device info
      await this.updateDeviceInfo(authData.user.email);

      // Track this email for future reference
      await this.addUserEmail(authData.user.email);

      console.log('Auth data stored successfully');
    } catch (error) {
      console.log('Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  /**
   * Get stored authentication data
   */
  async getAuthData(): Promise<StoredAuthData | null> {
    try {
      const authDataString = await SecureStore.getItemAsync(this.KEYS.AUTH_DATA);
      if (authDataString) {
        return JSON.parse(authDataString);
      }
      return null;
    } catch (error) {
      console.log('Error getting auth data:', error);
      return null;
    }
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.log('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.log('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const userProfileString = await AsyncStorage.getItem(this.KEYS.USER_PROFILE);
      if (userProfileString) {
        return JSON.parse(userProfileString);
      }
      return null;
    } catch (error) {
      console.log('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated and token is not expired
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return false;

      // Check if token is expired (add 5 minute buffer)
      const expirationTime = authData.loginTimestamp + (authData.expiresIn * 1000);
      const bufferTime = 5 * 60 * 1000; // 5 minutes
      const isExpired = Date.now() > (expirationTime - bufferTime);

      return !isExpired;
    } catch (error) {
      console.log('Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Update device information
   */
  private async updateDeviceInfo(userEmail: string): Promise<void> {
    try {
      const deviceId = await this.getOrCreateDeviceId();
      const existingInfo = await this.getDeviceInfo();
      
      const deviceInfo: DeviceInfo = {
        deviceId,
        isFirstTime: existingInfo ? false : true,
        lastLoginTimestamp: Date.now(),
        userCount: existingInfo ? existingInfo.userCount + 1 : 1,
      };

      await AsyncStorage.setItem(this.KEYS.DEVICE_INFO, JSON.stringify(deviceInfo));
      await AsyncStorage.setItem(this.KEYS.LAST_LOGIN_EMAIL, userEmail);
    } catch (error) {
      console.log('Error updating device info:', error);
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo | null> {
    try {
      const deviceInfoString = await AsyncStorage.getItem(this.KEYS.DEVICE_INFO);
      if (deviceInfoString) {
        return JSON.parse(deviceInfoString);
      }
      return null;
    } catch (error) {
      console.log('Error getting device info:', error);
      return null;
    }
  }

  /**
   * Check if this is a first-time device
   */
  async isFirstTimeDevice(): Promise<boolean> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      return !deviceInfo || deviceInfo.isFirstTime;
    } catch (error) {
      console.log('Error checking first-time device:', error);
      return true; // Default to first-time for safety
    }
  }

  /**
   * Check if device has existing user
   */
  async hasExistingUser(): Promise<boolean> {
    try {
      const authData = await this.getAuthData();
      const isAuthenticated = await this.isAuthenticated();
      return !!(authData && isAuthenticated);
    } catch (error) {
      console.log('Error checking existing user:', error);
      return false;
    }
  }

  /**
   * Add user email to the list of users who have logged in
   */
  private async addUserEmail(email: string): Promise<void> {
    try {
      const existingEmailsString = await AsyncStorage.getItem(this.KEYS.USER_EMAILS);
      const existingEmails: string[] = existingEmailsString ? JSON.parse(existingEmailsString) : [];
      
      if (!existingEmails.includes(email)) {
        existingEmails.push(email);
        await AsyncStorage.setItem(this.KEYS.USER_EMAILS, JSON.stringify(existingEmails));
      }
    } catch (error) {
      console.log('Error adding user email:', error);
    }
  }

  /**
   * Get list of emails that have logged in on this device
   */
  async getUserEmails(): Promise<string[]> {
    try {
      const emailsString = await AsyncStorage.getItem(this.KEYS.USER_EMAILS);
      return emailsString ? JSON.parse(emailsString) : [];
    } catch (error) {
      console.log('Error getting user emails:', error);
      return [];
    }
  }

  /**
   * Get the last logged in email
   */
  async getLastLoginEmail(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.KEYS.LAST_LOGIN_EMAIL);
    } catch (error) {
      console.log('Error getting last login email:', error);
      return null;
    }
  }

  /**
   * Enable/disable biometric login
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.KEYS.BIOMETRIC_ENABLED, enabled.toString());
    } catch (error) {
      console.log('Error setting biometric preference:', error);
    }
  }

  /**
   * Check if biometric login is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(this.KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.log('Error checking biometric preference:', error);
      return false;
    }
  }

  /**
   * Enable/disable auto login
   */
  async setAutoLoginEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.AUTO_LOGIN_ENABLED, enabled.toString());
    } catch (error) {
      console.log('Error setting auto login preference:', error);
    }
  }

  /**
   * Check if auto login is enabled
   */
  async isAutoLoginEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.KEYS.AUTO_LOGIN_ENABLED);
      return enabled !== 'false'; // Default to true if not set
    } catch (error) {
      console.log('Error checking auto login preference:', error);
      return true; // Default to enabled
    }
  }

  /**
   * Clear all authentication data
   */
  async clearAuthData(): Promise<void> {
    try {
      // Clear secure storage
      await SecureStore.deleteItemAsync(this.KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(this.KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(this.KEYS.AUTH_DATA);
      await SecureStore.deleteItemAsync(this.KEYS.BIOMETRIC_ENABLED);

      // Clear regular storage
      await AsyncStorage.removeItem(this.KEYS.USER_PROFILE);
      await AsyncStorage.removeItem(this.KEYS.AUTO_LOGIN_ENABLED);

      console.log('Auth data cleared successfully');
    } catch (error) {
      console.log('Error clearing auth data:', error);
    }
  }

  /**
   * Clear all data including device info (for complete reset)
   */
  async clearAllData(): Promise<void> {
    try {
      await this.clearAuthData();
      
      // Clear device info
      await AsyncStorage.removeItem(this.KEYS.DEVICE_INFO);
      await AsyncStorage.removeItem(this.KEYS.USER_EMAILS);
      await AsyncStorage.removeItem(this.KEYS.LAST_LOGIN_EMAIL);
      await SecureStore.deleteItemAsync(this.KEYS.DEVICE_ID);

      console.log('All data cleared successfully');
    } catch (error) {
      console.log('Error clearing all data:', error);
    }
  }

  /**
   * Get authentication status summary
   */
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    hasStoredAuth: boolean;
    isFirstTimeDevice: boolean;
    hasExistingUser: boolean;
    lastLoginEmail: string | null;
    biometricEnabled: boolean;
    autoLoginEnabled: boolean;
  }> {
    try {
      const [
        isAuthenticated,
        authData,
        isFirstTimeDevice,
        hasExistingUser,
        lastLoginEmail,
        biometricEnabled,
        autoLoginEnabled,
      ] = await Promise.all([
        this.isAuthenticated(),
        this.getAuthData(),
        this.isFirstTimeDevice(),
        this.hasExistingUser(),
        this.getLastLoginEmail(),
        this.isBiometricEnabled(),
        this.isAutoLoginEnabled(),
      ]);

      return {
        isAuthenticated,
        hasStoredAuth: !!authData,
        isFirstTimeDevice,
        hasExistingUser,
        lastLoginEmail,
        biometricEnabled,
        autoLoginEnabled,
      };
    } catch (error) {
      console.log('Error getting auth status:', error);
      return {
        isAuthenticated: false,
        hasStoredAuth: false,
        isFirstTimeDevice: true,
        hasExistingUser: false,
        lastLoginEmail: null,
        biometricEnabled: false,
        autoLoginEnabled: true,
      };
    }
  }

  /**
   * Refresh token if it's about to expire
   */
  async refreshTokenIfNeeded(): Promise<string | null> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return null;
      
      // Check if token is about to expire (5 minute buffer)
      const expirationTime = authData.loginTimestamp + (authData.expiresIn * 1000);
      const bufferTime = 5 * 60 * 1000; // 5 minutes
      const isAboutToExpire = Date.now() > (expirationTime - bufferTime);
      
      if (isAboutToExpire) {
        console.log('🔄 Token is about to expire, refreshing...');
        return await this.refreshToken();
      }
      
      return authData.accessToken;
    } catch (error) {
      console.error('❌ Error checking token refresh:', error);
      return null;
    }
  }

  /**
   * Refresh the access token using the refresh endpoint
   */
  private async refreshToken(): Promise<string | null> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return null;
      
      const authService = AuthService.getInstance();
      const refreshResult = await authService.refreshToken(authData.accessToken);
      
      if (refreshResult.success) {
        // Calculate new expiration time
        const expiresAt = new Date(refreshResult.expiresAt);
        const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
        
        // Update stored auth data with new token
        const updatedAuthData: StoredAuthData = {
          accessToken: refreshResult.access_token,
          refreshToken: authData.refreshToken, // Keep existing refresh token
          user: refreshResult.user,
          expiresIn,
          loginTimestamp: Date.now(),
        };
        
        await this.storeAuthData(updatedAuthData);
        console.log('✅ Token refreshed and stored successfully');
        
        return refreshResult.access_token;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return null;
    }
  }
}

export default AuthStorageService; 