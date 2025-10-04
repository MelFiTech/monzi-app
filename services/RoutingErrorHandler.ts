/**
 * Routing Error Handler
 * Handles routing errors and provides fallback navigation
 */

import { router } from 'expo-router';
import { Config } from '@/constants/config';

export class RoutingErrorHandler {
  private static instance: RoutingErrorHandler;
  private errorCount = 0;
  private maxRetries = 3;

  static getInstance(): RoutingErrorHandler {
    if (!RoutingErrorHandler.instance) {
      RoutingErrorHandler.instance = new RoutingErrorHandler();
    }
    return RoutingErrorHandler.instance;
  }

  /**
   * Handle routing errors with fallback navigation
   */
  handleRoutingError(error: Error, attemptedRoute?: string): void {
    console.error('🚨 Routing Error:', error);
    console.error('Attempted Route:', attemptedRoute);

    this.errorCount++;

    // If we've exceeded max retries, navigate to fallback
    if (this.errorCount >= this.maxRetries) {
      console.log('🔄 Max routing retries exceeded, navigating to fallback');
      this.navigateToFallback();
      return;
    }

    // Try to recover from the error
    this.attemptRecovery(attemptedRoute);
  }

  /**
   * Attempt to recover from routing error
   */
  private attemptRecovery(attemptedRoute?: string): void {
    try {
      // Clear any pending navigation
      router.dismissAll();
      
      // Wait a bit before retrying
      setTimeout(() => {
        if (attemptedRoute) {
          console.log('🔄 Retrying navigation to:', attemptedRoute);
          router.replace(attemptedRoute as any);
        } else {
          console.log('🔄 Navigating to home screen');
          router.replace('/(tabs)');
        }
      }, 1000);
    } catch (recoveryError) {
      console.error('❌ Recovery failed:', recoveryError);
      this.navigateToFallback();
    }
  }

  /**
   * Navigate to fallback route
   */
  private navigateToFallback(): void {
    try {
      console.log('🏠 Navigating to fallback route');
      router.replace(Config.PRODUCTION.fallbackRoute as any);
    } catch (fallbackError) {
      console.error('❌ Fallback navigation failed:', fallbackError);
      // Last resort - try to navigate to root
      router.replace('/');
    }
  }

  /**
   * Reset error count (call when navigation succeeds)
   */
  resetErrorCount(): void {
    this.errorCount = 0;
  }

  /**
   * Check if routing is in error state
   */
  isInErrorState(): boolean {
    return this.errorCount >= this.maxRetries;
  }
}

export default RoutingErrorHandler;
