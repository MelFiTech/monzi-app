/**
 * Environment Configuration
 * Handles different API URLs for development and production environments
 */

export const Config = {
  // API Configuration
  API: {
    // Production URL for render.com
    PRODUCTION_URL: 'https://monzi-backend.onrender.com',

    // Development URL (local IP) - UPDATED
    DEVELOPMENT_URL: process.env.EXPO_PUBLIC_DEV_API_URL || 'http://172.20.10.4:3000',

    // Get the appropriate base URL based on environment
    getBaseUrl(): string {
      // Check if we're in production (EAS Build production profile)
      const isProduction = process.env.EXPO_PUBLIC_ENV === 'production' ||
        process.env.NODE_ENV === 'production' ||
        (typeof __DEV__ !== 'undefined' && __DEV__ === false);

      return isProduction ? this.PRODUCTION_URL : this.DEVELOPMENT_URL;
    },

    // Common endpoints
    ENDPOINTS: {
      AUTH: '/auth',
      KYC: '/kyc',
      ACCOUNTS: '/accounts',
      USERS: '/users',
      TRANSACTIONS: '/transactions',
      WALLET: '/wallet',
    }
  },

  // App Configuration
  APP: {
    NAME: 'Monzi',
    VERSION: '1.0.0',
    BUNDLE_ID: 'com.dreemlab.monzi',
  },

  // Environment helpers
  isDevelopment(): boolean {
    return __DEV__ === true;
  },

  isProduction(): boolean {
    return __DEV__ === false;
  },

  getCurrentEnvironment(): 'development' | 'production' {
    return this.isProduction() ? 'production' : 'development';
  }
};

// Export convenience functions
export const getApiBaseUrl = () => Config.API.getBaseUrl();
export const getApiEndpoint = (endpoint: keyof typeof Config.API.ENDPOINTS) => {
  return `${Config.API.getBaseUrl()}${Config.API.ENDPOINTS[endpoint]}`;
};

// Log current configuration in development
if (__DEV__) {
  console.log('🔧 API Configuration:', {
    environment: Config.getCurrentEnvironment(),
    baseUrl: Config.API.getBaseUrl(),
    isDevelopment: Config.isDevelopment(),
    isProduction: Config.isProduction(),
  });
} 