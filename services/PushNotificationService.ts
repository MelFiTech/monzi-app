import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Config } from '@/constants/config';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    severity: 'default',
  }),
});

export interface PushNotificationData {
  type: 'wallet_funding' | 'transaction' | 'test' | 'general';
  amount?: string;
  netAmount?: string;
  fee?: string;
  provider?: string;
  transactionId?: string;
  message?: string;
  title?: string;
}

export interface PushTokenRegistration {
  token: string;
  deviceId: string;
  platform: string;
}

export class PushNotificationService {
  private static expoPushToken: string | null = null;
  private static isRegistered: boolean = false;

  static async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    console.log('📱 Starting push notification registration...');
    console.log('📱 Environment info:', {
      isDevice: Device.isDevice,
      platform: Platform.OS,
      appOwnership: Constants.appOwnership,
      executionEnvironment: Constants.executionEnvironment,
    });

    if (Device.isDevice) {
      try {
        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        console.log('📱 Current permission status:', existingStatus);
        
        if (existingStatus !== 'granted') {
          console.log('📱 Requesting push notification permissions...');
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.warn('⚠️ Push notification permission denied');
          return null;
        }
        
        console.log('✅ Push notification permissions granted');
        
        // Get the token with proper project ID handling
        console.log('📱 Getting Expo push token...');
        
        // Use project ID from Constants with fallback
        let projectId = Constants.expoConfig?.extra?.eas?.projectId;
        
        // For TestFlight/standalone builds, try alternative project ID sources
        if (!projectId) {
          projectId = Constants.easConfig?.projectId || 
                     '467a0d00-c4c0-4dbc-9b77-bfcc3cc5e1c4'; // Fallback
        }
        
        console.log('📱 Using Expo project ID:', projectId);
        console.log('📱 App ownership:', Constants.appOwnership);
        console.log('📱 Execution environment:', Constants.executionEnvironment);
        
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        
        token = tokenData.data;
        
        // Validate token format
        if (!token || !token.startsWith('ExponentPushToken[')) {
          console.error('❌ Invalid push token format:', token?.substring(0, 50));
          return null;
        }
        
        console.log('📱 Expo Push Token obtained:', token.substring(0, 30) + '...');
        console.log('📱 Token length:', token.length);
        
        this.expoPushToken = token;
        
      } catch (error) {
        console.error('❌ Error getting push token:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        return null;
      }
    } else {
      console.warn('⚠️ Push notifications only work on physical devices');
      return null;
    }

    // Configure for Android
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Monzi Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFD700', // Monzi yellow
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
        
        // Create additional channels for different notification types
        await Notifications.setNotificationChannelAsync('transactions', {
          name: 'Transaction Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500],
          lightColor: '#4CAF50', // Green for transactions
          sound: 'default',
        });
        
        await Notifications.setNotificationChannelAsync('wallet', {
          name: 'Wallet Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2196F3', // Blue for wallet
          sound: 'default',
        });
        
        console.log('📱 Android notification channels configured');
      } catch (error) {
        console.error('❌ Error configuring Android notifications:', error);
      }
    }

    return token;
  }

  static async registerTokenWithBackend(token: string, authToken: string): Promise<boolean> {
    try {
      console.log('🔄 Registering push token with backend...');
      console.log('📱 Token preview:', token.substring(0, 30) + '...');
      
      // Gather comprehensive device information
      const deviceInfo = {
        token: token,
        deviceId: Device.modelId || 'unknown',
        deviceName: Device.deviceName || 'unknown',
        platform: Platform.OS,
        osVersion: Platform.Version,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildVersion: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || 'unknown',
        appOwnership: Constants.appOwnership, // 'expo', 'standalone', etc.
        executionEnvironment: Constants.executionEnvironment, // 'storeClient', 'standalone', etc.
        isDevice: Device.isDevice,
        brand: Device.brand,
        manufacturer: Device.manufacturer,
      };
      
      console.log('📱 Device registration info:', {
        platform: deviceInfo.platform,
        deviceName: deviceInfo.deviceName,
        appOwnership: deviceInfo.appOwnership,
        executionEnvironment: deviceInfo.executionEnvironment,
        isDevice: deviceInfo.isDevice,
      });
      
      const baseUrl = Config.API.getBaseUrl();
      const endpoint = `${baseUrl}/push-notifications/register`;
      
      console.log('📡 Registration endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'User-Agent': `MonziApp/${deviceInfo.appVersion} (${deviceInfo.platform})`,
        },
        body: JSON.stringify(deviceInfo),
      });

      console.log('📨 Registration response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend registration failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        return false;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Push token registered successfully:', {
          tokenId: result.data?.tokenId || 'No ID returned',
          deviceId: result.data?.deviceId || deviceInfo.deviceId,
          platform: result.data?.platform || deviceInfo.platform
        });
        this.isRegistered = true;
        return true;
      } else {
        console.error('❌ Failed to register push token:', {
          error: result.error || 'Unknown error',
          message: result.message || 'No message',
          details: result.details || 'No details'
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error registering push token:', error);
      console.error('❌ Registration error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  static async unregisterToken(token: string, authToken: string): Promise<boolean> {
    try {
      console.log('🔄 Unregistering push token from backend...');
      
      const baseUrl = Config.API.getBaseUrl();
      const response = await fetch(`${baseUrl}/push-notifications/token/${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Push token unregistered successfully');
        this.isRegistered = false;
        this.expoPushToken = null;
        return true;
      } else {
        console.error('❌ Failed to unregister push token:', result.error || result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error unregistering push token:', error);
      return false;
    }
  }

  static async sendTestNotification(authToken: string, type: 'wallet_funding' | 'transaction' | 'test' = 'test'): Promise<boolean> {
    try {
      console.log(`🧪 Sending test ${type} notification...`);
      
      const baseUrl = Config.API.getBaseUrl();
      const response = await fetch(`${baseUrl}/push-notifications/test/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Test notification sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send test notification:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return false;
    }
  }

  static getToken(): string | null {
    return this.expoPushToken;
  }

  static isTokenRegistered(): boolean {
    return this.isRegistered;
  }

  static handleNotificationData(data: PushNotificationData): void {
    console.log('📱 Processing notification data:', data);
    
    switch (data.type) {
      case 'wallet_funding':
        this.handleWalletFunding(data);
        break;
        
      case 'transaction':
        this.handleTransaction(data);
        break;
        
      case 'test':
        console.log('🧪 Test notification received:', data.message);
        break;
        
      default:
        console.log('📱 Unknown notification type:', data.type);
    }
  }

  private static handleWalletFunding(data: PushNotificationData): void {
    console.log('💰 Wallet funding notification:', data);
    
    // This will be handled by the useNotificationService hook
    // which can update UI state, show toasts, navigate, etc.
  }

  private static handleTransaction(data: PushNotificationData): void {
    console.log('💳 Transaction notification:', data);
    
    // This will be handled by the useNotificationService hook
  }
} 