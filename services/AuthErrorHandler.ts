import { router } from 'expo-router';
import ToastService from './ToastService';
import AuthStorageService from './AuthStorageService';
import { WebSocketService } from './WebSocketService';
import { NotificationService } from './NotificationService';

/**
 * Global authentication error handler
 * Handles 401 responses and token expiration scenarios
 */
class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private isHandlingLogout = false;

  public static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  /**
   * Handle authentication errors (401, token expiration, etc.)
   */
  async handleAuthError(error: any, context?: string): Promise<void> {
    // Prevent multiple simultaneous logout processes
    if (this.isHandlingLogout) {
      console.log('🔄 Auth error handling already in progress, skipping...');
      return;
    }

    this.isHandlingLogout = true;

    try {
      console.log(`🚨 Authentication error detected${context ? ` in ${context}` : ''}:`, error);

      // Check if this is an authentication-related error
      const isAuthError = this.isAuthenticationError(error);
      
      if (isAuthError) {
        console.log('🔐 Authentication error confirmed, initiating logout...');
        
        // Show user notification
        ToastService.error('Your session has expired. Please log in again.');
        
        // Perform comprehensive logout
        await this.performLogout();
        
        // Navigate to login screen
        this.navigateToLogin();
      }
    } catch (logoutError) {
      console.error('❌ Error during auth error handling:', logoutError);
    } finally {
      this.isHandlingLogout = false;
    }
  }

  /**
   * Check if the error is authentication-related
   */
  private isAuthenticationError(error: any): boolean {
    // Check for 401 status code
    if (error?.statusCode === 401 || error?.status === 401) {
      return true;
    }

    // Check for authentication-related error messages
    const authErrorMessages = [
      'authentication token expired',
      'token expired',
      'unauthorized',
      'invalid token',
      'access denied',
      'authentication failed'
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    return authErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Perform comprehensive logout
   */
  private async performLogout(): Promise<void> {
    try {
      console.log('🚪 Performing comprehensive logout...');

      // 1. Clear React Query cache
      const { QueryClient } = await import('@tanstack/react-query');
      const queryClient = new QueryClient();
      queryClient.clear();

      // 2. Disconnect WebSocket
      try {
        const webSocketService = WebSocketService.getInstance();
        webSocketService.disconnect();
        console.log('✅ WebSocket disconnected');
      } catch (error) {
        console.log('⚠️ Error disconnecting WebSocket:', error);
      }

      // 3. Disconnect NotificationService
      try {
        const notificationService = NotificationService.getInstance();
        notificationService.disconnect();
        console.log('✅ NotificationService disconnected');
      } catch (error) {
        console.log('⚠️ Error disconnecting NotificationService:', error);
      }

      // 4. Clear all auth data
      const authStorageService = AuthStorageService.getInstance();
      await authStorageService.clearAuthData();
      console.log('✅ Auth data cleared');

      // 5. Clear additional storage items
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await Promise.all([
        AsyncStorage.removeItem('is_in_kyc_flow'),
        AsyncStorage.removeItem('requireReauth'),
        AsyncStorage.removeItem('last_activity'),
        AsyncStorage.removeItem('fresh_registration'),
        AsyncStorage.removeItem('modal_dismissed_by_user'),
      ]);
      console.log('✅ Additional storage cleared');

      console.log('✅ Comprehensive logout completed');
    } catch (error) {
      console.error('❌ Error during logout process:', error);
      throw error;
    }
  }

  /**
   * Navigate to login screen
   */
  private navigateToLogin(): void {
    try {
      console.log('🏠 Navigating to login screen...');
      router.replace('/(auth)/splash');
    } catch (error) {
      console.error('❌ Error navigating to login:', error);
    }
  }

  /**
   * Handle API response for authentication errors
   */
  async handleApiResponse(response: Response, context?: string): Promise<void> {
    if (response.status === 401) {
      await this.handleAuthError({
        statusCode: 401,
        message: 'Authentication token expired',
        context
      }, context);
    }
  }
}

export default AuthErrorHandler;
