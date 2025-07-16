import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePushNotificationService } from '../hooks/usePushNotificationService';
import { AuthStorageService, AuthService } from '../services';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  authToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<boolean>;
  // Push notification state
  expoPushToken: string | null;
  isPushRegistered: boolean;
  pushError: string | null;
  // Push notification permissions
  permissionStatus: 'unknown' | 'granted' | 'denied' | 'undetermined';
  hasPermissions: boolean;
  canRequestPermissions: boolean;
  requestPermissions: () => Promise<boolean>;
  registerForPushNotifications: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Initialize push notifications with permission-based approach
  const {
    expoPushToken,
    isRegistered: isPushRegistered,
    error: pushError,
    permissionStatus,
    hasPermissions,
    canRequestPermissions,
    requestPermissions,
    registerForPushNotifications,
    unregisterPushNotifications,
  } = usePushNotificationService(authToken, {
    autoConnect: false, // Manual control
    showToasts: true,
    autoRequestPermissions: true, // Auto-request permissions when user is authenticated
    onWalletFunding: (data) => {
      console.log('💰 AuthProvider: Wallet funding notification received:', data);
    },
    onTransaction: (data) => {
      console.log('💳 AuthProvider: Transaction notification received:', data);
    },
  });

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔍 Checking auth state...');
      
      // Check for stored auth data using the correct instance method
      const authStorageService = AuthStorageService.getInstance();
      const storedAuthData = await authStorageService.getAuthData();
      
      if (storedAuthData && storedAuthData.accessToken && storedAuthData.user) {
        console.log('✅ Found stored auth data:', {
          user: storedAuthData.user.email,
          tokenExists: !!storedAuthData.accessToken
        });
        
        setUser(storedAuthData.user);
        setAuthToken(storedAuthData.accessToken);
        return true;
      } else {
        console.log('❌ No valid auth data found');
        setUser(null);
        setAuthToken(null);
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking auth state:', error);
      setUser(null);
      setAuthToken(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User, token: string): Promise<void> => {
    try {
      console.log('🔑 Logging in user:', userData.email);
      
      // Store auth data using the correct method signature
      const authStorageService = AuthStorageService.getInstance();
      await authStorageService.storeAuthData({
        accessToken: token,
        refreshToken: token, // Using same token for now - this should be separate refresh token
        user: userData,
        expiresIn: 3600, // 1 hour default - this should come from login response
      });
      
      // Update state
      setUser(userData);
      setAuthToken(token);
      
      console.log('✅ Login successful, push notifications will auto-register');
    } catch (error) {
      console.error('❌ Error during login:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 Logging out user...');
      
      // Clear KYC flow flag first to stop any ongoing backend checks
      try {
        await AsyncStorage.removeItem('is_in_kyc_flow');
        console.log('🔄 Cleared KYC flow flag during logout');
      } catch (error) {
        console.log('⚠️ Failed to clear KYC flow flag:', error);
      }
      
      // Clear React Query cache early to stop all queries immediately
      console.log('🗑️ Clearing React Query cache...');
      queryClient.clear();
      
      // Clear state early to trigger auth state changes
      setUser(null);
      setAuthToken(null);
      
      // Small delay to allow state changes to propagate and stop hooks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Notify backend about sign-out to disable transaction notifications
      if (authToken) {
        try {
          const authService = AuthService.getInstance();
          await authService.signOut(authToken);
          console.log('✅ Backend sign-out notification sent successfully');
        } catch (error) {
          console.log('⚠️ Failed to notify backend about sign-out:', error);
          // Continue with local cleanup even if backend notification fails
        }
      }
      
      // Unregister push notifications if registered
      if (isPushRegistered && expoPushToken && authToken) {
        console.log('🔄 Unregistering push notifications...');
        await unregisterPushNotifications();
      }
      
      // Clear stored auth data using the correct instance method
      const authStorageService = AuthStorageService.getInstance();
      await authStorageService.clearAuthData();
      
      console.log('✅ Logout successful - all session data cleared');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Even if some steps fail, still clear local state and cache
      setUser(null);
      setAuthToken(null);
      queryClient.clear();
      const authStorageService = AuthStorageService.getInstance();
      await authStorageService.clearAuthData();
      
      // Clear KYC flow flag in error case too
      try {
        await AsyncStorage.removeItem('is_in_kyc_flow');
      } catch (flagError) {
        console.log('⚠️ Failed to clear KYC flow flag in error handler:', flagError);
      }
    }
  };

  const value: AuthContextType = {
    user,
    authToken,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuthState,
    // Push notification state
    expoPushToken,
    isPushRegistered,
    pushError,
    // Push notification permissions
    permissionStatus,
    hasPermissions,
    canRequestPermissions,
    requestPermissions,
    registerForPushNotifications,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 