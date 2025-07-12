import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import NotificationService, {
  WalletBalanceUpdateData,
  TransactionNotificationData,
  GeneralNotificationData,
  NotificationPayload,
  NotificationEventHandlers,
  NotificationServiceOptions,
} from '../services/NotificationService';
import ToastService from '../services/ToastService';

export interface NotificationState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastWalletUpdate: NotificationPayload<WalletBalanceUpdateData> | null;
  lastTransaction: NotificationPayload<TransactionNotificationData> | null;
  lastNotification: NotificationPayload<GeneralNotificationData> | null;
  reconnectAttempts: number;
}

export interface NotificationHookOptions extends NotificationServiceOptions {
  autoConnect?: boolean;
  showToasts?: boolean;
  enableBalanceUpdates?: boolean;
  enableTransactionNotifications?: boolean;
  enableGeneralNotifications?: boolean;
}

export interface NotificationCallbacks {
  onWalletBalanceUpdate?: (notification: NotificationPayload<WalletBalanceUpdateData>) => void;
  onTransactionNotification?: (notification: NotificationPayload<TransactionNotificationData>) => void;
  onGeneralNotification?: (notification: NotificationPayload<GeneralNotificationData>) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: any) => void;
}

export const useNotificationService = (
  options: NotificationHookOptions = {},
  callbacks: NotificationCallbacks = {}
) => {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<NotificationState>({
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    lastWalletUpdate: null,
    lastTransaction: null,
    lastNotification: null,
    reconnectAttempts: 0,
  });

  const notificationServiceRef = useRef<NotificationService | null>(null);
  const eventHandlersRef = useRef<Set<() => void>>(new Set());

  const {
    autoConnect = true,
    showToasts = true,
    enableBalanceUpdates = true,
    enableTransactionNotifications = true,
    enableGeneralNotifications = true,
    ...serviceOptions
  } = options;

  /**
   * Initialize notification service
   */
  const initializeService = useCallback(() => {
    if (!notificationServiceRef.current) {
      notificationServiceRef.current = NotificationService.getInstance(serviceOptions);
    }
    return notificationServiceRef.current;
  }, [serviceOptions]);

  /**
   * Connect to notifications
   */
  const connect = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !isAuthenticated) {
      console.warn('⚠️ Cannot connect to notifications - user not authenticated');
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true, connectionError: null }));

    try {
      const service = initializeService();
      const success = await service.connect(user.id);
      
      setState(prev => ({ 
        ...prev, 
        isConnected: success, 
        isConnecting: false,
        connectionError: null 
      }));

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false,
        connectionError: errorMessage 
      }));
      
      console.error('❌ Failed to connect to notifications:', error);
      callbacks.onError?.(error);
      return false;
    }
  }, [user?.id, isAuthenticated, initializeService, callbacks]);

  /**
   * Disconnect from notifications
   */
  const disconnect = useCallback(() => {
    if (notificationServiceRef.current) {
      notificationServiceRef.current.disconnect();
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false,
        connectionError: null 
      }));
    }
  }, []);

  /**
   * Manually reconnect
   */
  const reconnect = useCallback(async (): Promise<boolean> => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    return await connect();
  }, [disconnect, connect]);

  /**
   * Show toast notification
   */
  const showToast = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (showToasts) {
      ToastService.show(message, type);
    }
  }, [showToasts]);

  /**
   * Format currency amount
   */
  const formatAmount = useCallback((amount: number): string => {
    return `₦${amount.toLocaleString()}`;
  }, []);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    if (!notificationServiceRef.current) return;

    const service = notificationServiceRef.current;
    const cleanup: (() => void)[] = [];

    // Connection events
    const handleConnect = () => {
      setState(prev => ({ ...prev, isConnected: true, connectionError: null }));
      callbacks.onConnect?.();
    };

    const handleDisconnect = (reason: string) => {
      setState(prev => ({ ...prev, isConnected: false }));
      callbacks.onDisconnect?.(reason);
    };

    const handleError = (error: any) => {
      setState(prev => ({ ...prev, connectionError: error.message || 'Connection error' }));
      callbacks.onError?.(error);
    };

    // Wallet balance update
    const handleWalletBalanceUpdate = (notification: NotificationPayload<WalletBalanceUpdateData>) => {
      setState(prev => ({ ...prev, lastWalletUpdate: notification }));
      
      if (enableBalanceUpdates) {
        const { data } = notification;
        showToast(
          'Wallet Updated',
          `Your wallet has been ${data.amount > 0 ? 'credited' : 'debited'} with ${formatAmount(Math.abs(data.amount))}. New balance: ${formatAmount(data.newBalance)}`,
          'success'
        );
      }
      
      callbacks.onWalletBalanceUpdate?.(notification);
    };

    // Transaction notification
    const handleTransactionNotification = (notification: NotificationPayload<TransactionNotificationData>) => {
      setState(prev => ({ ...prev, lastTransaction: notification }));
      
      if (enableTransactionNotifications) {
        const { data } = notification;
        showToast(
          'Transaction Update',
          `${data.type === 'credit' ? 'Received' : 'Sent'} ${formatAmount(data.amount)} - ${data.description}`,
          data.status === 'COMPLETED' ? 'success' : data.status === 'FAILED' ? 'error' : 'info'
        );
      }
      
      callbacks.onTransactionNotification?.(notification);
    };

    // General notification
    const handleGeneralNotification = (notification: NotificationPayload<GeneralNotificationData>) => {
      setState(prev => ({ ...prev, lastNotification: notification }));
      
      if (enableGeneralNotifications) {
        const { data } = notification;
        showToast(data.title, data.message, data.type);
      }
      
      callbacks.onGeneralNotification?.(notification);
    };

    // Register event handlers
    service.on('connect', handleConnect);
    service.on('disconnect', handleDisconnect);
    service.on('connect_error', handleError);
    service.on('wallet_balance_updated', handleWalletBalanceUpdate);
    service.on('transaction_notification', handleTransactionNotification);
    service.on('notification', handleGeneralNotification);

    // Store cleanup functions
    cleanup.push(() => service.off('connect', handleConnect));
    cleanup.push(() => service.off('disconnect', handleDisconnect));
    cleanup.push(() => service.off('connect_error', handleError));
    cleanup.push(() => service.off('wallet_balance_updated', handleWalletBalanceUpdate));
    cleanup.push(() => service.off('transaction_notification', handleTransactionNotification));
    cleanup.push(() => service.off('notification', handleGeneralNotification));

    // Store cleanup functions for component unmount
    eventHandlersRef.current = new Set(cleanup);

    return () => {
      cleanup.forEach(fn => fn());
      eventHandlersRef.current.clear();
    };
  }, [
    callbacks,
    enableBalanceUpdates,
    enableTransactionNotifications,
    enableGeneralNotifications,
    showToast,
    formatAmount
  ]);

  /**
   * Auto-connect when user is authenticated
   */
  useEffect(() => {
    if (autoConnect && isAuthenticated && user?.id && !state.isConnected && !state.isConnecting) {
      console.log('🔌 Auto-connecting to notifications for user:', user.id);
      connect();
    }
  }, [autoConnect, isAuthenticated, user?.id, state.isConnected, state.isConnecting, connect]);

  /**
   * Disconnect when user logs out
   */
  useEffect(() => {
    if (!isAuthenticated && state.isConnected) {
      console.log('🔌 User logged out, disconnecting from notifications');
      disconnect();
    }
  }, [isAuthenticated, state.isConnected, disconnect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clean up event handlers
      eventHandlersRef.current.forEach(cleanup => cleanup());
      eventHandlersRef.current.clear();
      
      // Disconnect service
      if (notificationServiceRef.current) {
        notificationServiceRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Get connection info
   */
  const getConnectionInfo = useCallback(() => {
    const service = notificationServiceRef.current;
    return {
      isConnected: service?.isSocketConnected() || false,
      currentUserId: service?.getCurrentUserId() || null,
      hasService: !!service,
    };
  }, []);

  /**
   * Subscribe to specific events
   */
  const subscribe = useCallback(<K extends keyof NotificationEventHandlers>(
    event: K,
    handler: NotificationEventHandlers[K]
  ) => {
    const service = initializeService();
    service.on(event, handler);
    
    return () => {
      service.off(event, handler);
    };
  }, [initializeService]);

  return {
    // State
    ...state,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    subscribe,
    
    // Utils
    getConnectionInfo,
    formatAmount,
    
    // Service instance (for advanced usage)
    service: notificationServiceRef.current,
  };
}; 