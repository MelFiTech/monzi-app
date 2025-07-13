import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export interface BiometricResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

class BiometricService {
  private static instance: BiometricService;
  private static readonly BIOMETRIC_PIN_KEY = 'biometric_stored_pin';
  private static readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

  public static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  /**
   * Check if biometric authentication is available on the device
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return isAvailable && isEnrolled;
    } catch (error) {
      console.log('Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Get the type of biometric authentication available
   */
  async getBiometricType(): Promise<string[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'Touch ID';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'Face ID';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'Iris';
          default:
            return 'Biometric';
        }
      });
    } catch (error) {
      console.log('Error getting biometric type:', error);
      return ['Biometric'];
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(reason?: string): Promise<BiometricResult> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication not available'
        };
      }

      const biometricTypes = await this.getBiometricType();
      const defaultReason = `Use ${biometricTypes[0] || 'biometric authentication'} to access your account`;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || defaultReason,
        cancelLabel: 'Use Passcode',
        disableDeviceFallback: false,
        requireConfirmation: false,
      });

      if (result.success) {
        return {
          success: true,
          biometricType: biometricTypes[0]
        };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed'
        };
      }
    } catch (error) {
      console.log('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Store user's PIN securely for biometric authentication
   */
  async storePin(pin: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(BiometricService.BIOMETRIC_PIN_KEY, pin);
      await SecureStore.setItemAsync(BiometricService.BIOMETRIC_ENABLED_KEY, 'true');
      console.log('✅ PIN stored securely for biometric authentication');
      return true;
    } catch (error) {
      console.error('❌ Failed to store PIN for biometric authentication:', error);
      return false;
    }
  }

  /**
   * Retrieve stored PIN after successful biometric authentication
   */
  async getStoredPin(): Promise<string | null> {
    try {
      const pin = await SecureStore.getItemAsync(BiometricService.BIOMETRIC_PIN_KEY);
      return pin;
    } catch (error) {
      console.error('❌ Failed to retrieve stored PIN:', error);
      return null;
    }
  }

  /**
   * Check if biometric authentication is enabled (PIN stored)
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BiometricService.BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('❌ Failed to check biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Clear stored PIN and disable biometric authentication
   */
  async clearBiometricData(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(BiometricService.BIOMETRIC_PIN_KEY);
      await SecureStore.deleteItemAsync(BiometricService.BIOMETRIC_ENABLED_KEY);
      console.log('✅ Biometric data cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear biometric data:', error);
      return false;
    }
  }
}

export default BiometricService; 