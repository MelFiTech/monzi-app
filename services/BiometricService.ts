import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export interface BiometricResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

class BiometricService {
  private static instance: BiometricService;

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

  // Note: Auth storage methods moved to AuthStorageService
  // This service now focuses purely on biometric authentication functionality
}

export default BiometricService; 