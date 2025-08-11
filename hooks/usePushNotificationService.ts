import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import PushNotificationService from '@/services/PushNotificationService';
import { ToastService, AuthStorageService } from '@/services';
import { router } from 'expo-router';

interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isInitializing: boolean;
  error: string | null;
  hasAttemptedRegistration: boolean;
  permissionStatus: 'unknown' | 'granted' | 'denied' | 'undetermined';
  hasRequestedPermission: boolean;
}

interface UsePushNotificationOptions {
  autoConnect?: boolean;
  showToasts?: boolean;
  autoRequestPermissions?: boolean; // New option to auto-request permissions
  onWalletFunding?: (data: any) => void;
  onTransaction?: (data: any) => void;
  onLocationPayment?: (data: any) => void; // New callback for location payments
}

// Query keys for push notifications
const pushNotificationKeys = {
  all: ['pushNotifications'] as const,
  registration: (token: string) => [...pushNotificationKeys.all, 'registration', token] as const,
  permissions: () => [...pushNotificationKeys.all, 'permissions'] as const,
} as const;

export function usePushNotificationService(
  authToken: string | null,
  options: UsePushNotificationOptions = {}
) {
  const {
    autoConnect = false,
    showToasts = false,
    autoRequestPermissions = true, // Auto-request permissions by default
    onWalletFunding,
    onTransaction,
    onLocationPayment,
  } = options;

  // State
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    notification: null,
    isInitializing: false,
    error: null,
    hasAttemptedRegistration: false,
    permissionStatus: 'unknown',
    hasRequestedPermission: false,
  });

  // Refs for notification listeners
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // React Query for checking permissions
  const { data: permissionData, refetch: refetchPermissions } = useQuery({
    queryKey: pushNotificationKeys.permissions(),
    queryFn: async () => {
      const { status } = await Notifications.getPermissionsAsync();
      return { status };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Check every 30 seconds
  });

  // Handle permission data changes
  useEffect(() => {
    if (permissionData) {
      setState(prev => ({ 
        ...prev, 
        permissionStatus: permissionData.status,
        hasRequestedPermission: permissionData.status !== 'undetermined'
      }));
    }
  }, [permissionData]);

  // React Query mutation for backend registration
  const registerTokenMutation = useMutation({
    mutationFn: async ({ token, authToken, isLogin = false }: { token: string; authToken: string; isLogin?: boolean }) => {
      const success = isLogin 
        ? await PushNotificationService.updateDeviceTokenForLogin(token, authToken)
        : await PushNotificationService.registerTokenWithBackend(token, authToken);
      if (!success) {
        throw new Error('Failed to register push token with backend');
      }
      return { success };
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
    onSuccess: () => {
      setState(prev => ({ ...prev, hasAttemptedRegistration: true }));
      console.log('✅ Push notifications enabled');
    },
    onError: (error: any) => {
      setState(prev => ({ 
        ...prev, 
        error: error?.message || 'Failed to register push notifications',
        hasAttemptedRegistration: true
      }));
      
      if (showToasts && !error?.message?.includes('Network request failed')) {
        ToastService.error('Push notification setup failed');
      }
    },
  });

  // Memoized registration status
  const isRegistered = useMemo(() => {
    return registerTokenMutation.isSuccess && !!state.expoPushToken;
  }, [registerTokenMutation.isSuccess, state.expoPushToken]);

  // Check if we can request permissions
  const canRequestPermissions = useMemo(() => {
    return state.permissionStatus === 'undetermined' && !state.hasRequestedPermission;
  }, [state.permissionStatus, state.hasRequestedPermission]);

  // Check if permissions are granted
  const hasPermissions = useMemo(() => {
    return state.permissionStatus === 'granted';
  }, [state.permissionStatus]);

  // Request push notification permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (state.hasRequestedPermission) {
      return state.permissionStatus === 'granted';
    }

    try {
      setState(prev => ({ ...prev, isInitializing: true }));
      
      const { status } = await Notifications.requestPermissionsAsync();
      
      setState(prev => ({ 
        ...prev, 
        permissionStatus: status,
        hasRequestedPermission: true,
        isInitializing: false
      }));

      // Refetch permissions to update cache
      refetchPermissions();

      if (status === 'granted') {
        console.log('✅ Push notifications enabled');
        return true;
      } else {
        if (showToasts) {
          ToastService.info('Push notifications disabled');
        }
        return false;
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to request permissions',
        isInitializing: false
      }));
      return false;
    }
  }, [state.hasRequestedPermission, state.permissionStatus, showToasts, refetchPermissions]);

  // Get push token (only when permissions are granted)
  const getPushToken = useCallback(async (): Promise<string | null> => {
    if (!hasPermissions) {
      setState(prev => ({ ...prev, error: 'Push notification permissions not granted' }));
      return null;
    }

    try {
      setState(prev => ({ ...prev, isInitializing: true, error: null }));
      
      const token = await PushNotificationService.registerForPushNotifications();
      
      if (token) {
        setState(prev => ({ ...prev, expoPushToken: token }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to get push token' 
        }));
      }
      
      return token;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error getting push token'
      }));
      return null;
    } finally {
      setState(prev => ({ ...prev, isInitializing: false }));
    }
  }, [hasPermissions]);

  // Register for push notifications (with permission check)
  const registerForPushNotifications = useCallback(async (isLogin = false): Promise<boolean> => {
    if (!authToken) {
      setState(prev => ({ ...prev, error: 'Cannot register without auth token' }));
      return false;
    }

    if (registerTokenMutation.isPending || state.hasAttemptedRegistration) {
      return false;
    }

    // Check permissions first
    if (!hasPermissions) {
      if (canRequestPermissions) {
        const granted = await requestPermissions();
        if (!granted) {
          return false;
        }
      } else {
        setState(prev => ({ ...prev, error: 'Push notification permissions required' }));
        return false;
      }
    }

    try {
      // Get push token if we don't have one
      let token = state.expoPushToken;
      if (!token) {
        token = await getPushToken();
        if (!token) {
          return false;
        }
      }

      // Register with backend using React Query mutation
      await registerTokenMutation.mutateAsync({ token, authToken, isLogin });
      return true;
    } catch (error) {
      return false;
    }
  }, [authToken, state.expoPushToken, state.hasAttemptedRegistration, hasPermissions, canRequestPermissions, requestPermissions, getPushToken, registerTokenMutation]);

  // Unregister push notifications
  const unregisterPushNotifications = useCallback(async (): Promise<boolean> => {
    if (!state.expoPushToken || !authToken) {
      return false;
    }

    try {
      const success = await PushNotificationService.unregisterToken(state.expoPushToken, authToken);
      
      if (success) {
        setState(prev => ({
          ...prev,
          expoPushToken: null,
          error: null,
          hasAttemptedRegistration: false,
        }));
        registerTokenMutation.reset();
      }

      return success;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to unregister'
      }));
      return false;
    }
  }, [state.expoPushToken, authToken, registerTokenMutation]);

  // Send test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!state.expoPushToken || !authToken) {
      setState(prev => ({ ...prev, error: 'No push token or auth token available' }));
      return false;
    }

    try {
      const success = await PushNotificationService.sendTestNotification(authToken, 'test');
      
      if (showToasts) {
        if (success) {
          ToastService.success('Test notification sent');
        } else {
          ToastService.error('Failed to send test notification');
        }
      }

      return success;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to send test notification'
      }));
      return false;
    }
  }, [state.expoPushToken, authToken, showToasts]);

  // Notification handlers
  const handleNotificationReceived = useCallback((notification: Notifications.Notification) => {
    setState(prev => ({ ...prev, notification }));

    const data = notification.request.content.data;
    
    if (data?.type === 'wallet_funding' && onWalletFunding) {
      onWalletFunding(data);
    } else if (data?.type === 'transaction' && onTransaction) {
      onTransaction(data);
    } else if (
      (
        data?.type === 'location' ||
        data?.type === 'location_payment' ||
        (Array.isArray((data as any)?.paymentSuggestions) && (data as any)?.paymentSuggestions.length > 0)
      ) && onLocationPayment
    ) {
      // Foreground location payment push
      onLocationPayment(data);
    }
  }, [onWalletFunding, onTransaction, onLocationPayment]);

  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    console.log('📱 Notification tap received:', data);
    
    // Handle location payment notification tap
    const isLocationPayment =
      data?.type === 'location' ||
      data?.type === 'location_payment' ||
      (data?.accountNumber && data?.bankName && data?.accountName) ||
      (Array.isArray(data?.paymentSuggestions) && data?.paymentSuggestions.length > 0);

    if (isLocationPayment) {
      
      console.log('📍 Location payment notification tapped:', {
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        accountName: data.accountName,
        bankCode: data.bankCode,
        hasSuggestions: Array.isArray(data?.paymentSuggestions)
      });
      
      // Navigate to camera screen (main screen) where manual transfer modal is available
      router.push('/(tabs)');
      
      // Store the payment data for the manual transfer modal to use
      // We'll use AsyncStorage to pass data between notification tap and modal
      // Prefer nested suggestion payload if present; else fallback to top-level fields
      const firstSuggestion = Array.isArray(data?.paymentSuggestions) && data.paymentSuggestions.length > 0
        ? data.paymentSuggestions[0]
        : undefined;

      const paymentData = {
        accountNumber: firstSuggestion?.accountNumber ?? data.accountNumber,
        bankName: firstSuggestion?.bankName ?? data.bankName,
        accountName: firstSuggestion?.accountName ?? data.accountName,
        bankCode: firstSuggestion?.bankCode ?? data.bankCode,
        frequency: firstSuggestion?.frequency ?? data.frequency,
        lastTransactionDate: firstSuggestion?.lastTransactionDate ?? data.lastTransactionDate,
        source: 'notification_tap',
        // Optional extras
        locationId: data.locationId,
        locationName: data.locationName,
        locationAddress: data.locationAddress,
        distance: data.distance,
      } as any;
      
      // Store payment data for manual transfer modal to pick up
      import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
        Promise.all([
          AsyncStorage.setItem('notification_payment_data', JSON.stringify(paymentData)),
          AsyncStorage.setItem('should_open_manual_modal', 'true') // Flag to open modal on navigation
        ])
          .then(() => {
            console.log('💾 Payment data stored for manual transfer modal');
          })
          .catch((error) => {
            console.error('❌ Failed to store payment data:', error);
          });
      });
      
      // Call the callback if provided
      if (onLocationPayment) {
        onLocationPayment(data);
      }
      
      return;
    }
    
    // Handle notification tap/interaction
    if (data?.action) {
      // Navigate based on notification action
      console.log('📱 Notification interaction:', data.action);
    }
  }, [onLocationPayment]);

  // Set up notification listeners
  useEffect(() => {
    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(handleNotificationReceived);

    // Listen for user interaction with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationReceived, handleNotificationResponse]);

  // Auto-request permissions if not requested yet
  useEffect(() => {
    if (autoRequestPermissions && canRequestPermissions && authToken) {
      const timer = setTimeout(() => {
        requestPermissions();
      }, 1000); // Small delay to avoid immediate prompts

      return () => clearTimeout(timer);
    }
  }, [autoRequestPermissions, canRequestPermissions, authToken, requestPermissions]);

  // Auto-register for push notifications when authenticated and have permissions
  useEffect(() => {
    const autoRegister = async () => {
      if (
        authToken && 
        hasPermissions && 
        !state.hasAttemptedRegistration && 
        !registerTokenMutation.isPending
      ) {
        // Check if this is a login scenario by checking for existing auth data
        const authStorageService = AuthStorageService.getInstance();
        const existingAuthData = await authStorageService.getAuthData();
        const isLoginScenario = !!existingAuthData;
        
        console.log(`📱 Auto-registering for push notifications (${isLoginScenario ? 'login' : 'registration'} scenario)...`);
        await registerForPushNotifications(isLoginScenario);
      }
    };

    // Small delay to ensure all state is settled
    const timer = setTimeout(autoRegister, 1500);
    return () => clearTimeout(timer);
  }, [authToken, hasPermissions, state.hasAttemptedRegistration, registerTokenMutation.isPending, registerForPushNotifications]);

  // Handle token refresh - re-register if token changes
  useEffect(() => {
    const handleTokenRefresh = async () => {
      if (
        authToken && 
        state.expoPushToken && 
        hasPermissions && 
        !registerTokenMutation.isPending &&
        !isRegistered // Only if not currently registered
      ) {
        // Check if this is a login scenario
        const authStorageService = AuthStorageService.getInstance();
        const existingAuthData = await authStorageService.getAuthData();
        const isLoginScenario = !!existingAuthData;
        
        console.log(`📱 Token detected but not registered - re-registering (${isLoginScenario ? 'login' : 'registration'} scenario)...`);
        await registerForPushNotifications(isLoginScenario);
      }
    };

    handleTokenRefresh();
  }, [state.expoPushToken, authToken, hasPermissions, isRegistered, registerTokenMutation.isPending, registerForPushNotifications]);

  // Clean up on auth token removal
  useEffect(() => {
    if (!authToken && isRegistered) {
      setState(prev => ({
        ...prev,
        expoPushToken: null,
        error: null,
        hasAttemptedRegistration: false,
      }));
      registerTokenMutation.reset();
    }
  }, [authToken, isRegistered, registerTokenMutation]);

  return {
    // State
    expoPushToken: state.expoPushToken,
    isRegistered,
    notification: state.notification,
    isInitializing: state.isInitializing || registerTokenMutation.isPending,
    error: state.error || (registerTokenMutation.error?.message),
    
    // Permission state
    permissionStatus: state.permissionStatus,
    hasPermissions,
    canRequestPermissions,
    hasRequestedPermission: state.hasRequestedPermission,

    // Methods
    requestPermissions,
    registerForPushNotifications,
    unregisterPushNotifications,
    sendTestNotification,

    // Utilities
    clearNotification: () => setState(prev => ({ ...prev, notification: null })),
    clearError: () => {
      setState(prev => ({ ...prev, error: null }));
      registerTokenMutation.reset();
    },
  };
} 