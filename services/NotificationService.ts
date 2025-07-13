import { io, Socket } from 'socket.io-client';
import { Config } from '../constants/config';
import AuthStorageService from './AuthStorageService';

// Notification Types
export interface WalletBalanceUpdateData {
  oldBalance: number;
  newBalance: number;
  change: number; // Backend uses "change" not "amount"
  currency: string;
  accountNumber: string;
  reference: string; // Backend uses "reference" not "transactionReference"
  timestamp: string;
}

export interface TransactionNotificationData {
  type: 'FUNDING' | 'DEBIT' | 'TRANSFER';
  amount: number;
  currency: string;
  description: string;
  reference: string; // Backend uses "reference" not "transactionReference"
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  timestamp: string;
}

export interface GeneralNotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  metadata?: {
    amount?: number;
    newBalance?: number;
    transactionReference?: string;
    [key: string]: any;
  };
}

export interface NotificationPayload<T = any> {
  data: T;
  timestamp: string;
  userId: string;
}

// Event Types
export type NotificationEventType = 
  | 'wallet_balance_updated'
  | 'transaction_notification'
  | 'notification'
  | 'joined_room'
  | 'connect'
  | 'disconnect'
  | 'connect_error';

export interface NotificationEventHandlers {
  wallet_balance_updated: (notification: WalletBalanceUpdateData) => void;
  transaction_notification: (notification: TransactionNotificationData) => void;
  notification: (notification: NotificationPayload<GeneralNotificationData>) => void;
  joined_room: (data: { userId: string; message: string; timestamp: string }) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: any) => void;
}

export interface NotificationServiceOptions {
  enableAutoReconnect?: boolean;
  maxReconnectAttempts?: number;
  transports?: ('websocket' | 'polling')[];
}

class NotificationService {
  private static instance: NotificationService;
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private currentUserId: string | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private options: NotificationServiceOptions = {}) {
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }

  public static getInstance(options?: NotificationServiceOptions): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(options);
    }
    return NotificationService.instance;
  }

  /**
   * Get WebSocket URL from configuration
   */
  private getWebSocketUrl(): string {
    const baseUrl = Config.API.getBaseUrl();
    // Socket.IO uses HTTP/HTTPS URLs, not WS/WSS - it handles the protocol upgrade internally
    return `${baseUrl}/notifications`;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(userId: string): Promise<boolean> {
    try {
      if (this.socket && this.isConnected && this.currentUserId === userId) {
        console.log('🔌 Already connected to notifications');
        return true;
      }

      // Disconnect existing connection if any
      if (this.socket) {
        this.disconnect();
      }

      this.currentUserId = userId;
      
      const wsUrl = this.getWebSocketUrl();
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      // Get auth token for secure connection
      const authStorageService = AuthStorageService.getInstance();
      const authData = await authStorageService.getAuthData();
      const token = authData?.accessToken;

      this.socket = io(wsUrl, {
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        auth: {
          userId: userId,
          ...(token && { token: token }),
        },
        transports: this.options.transports || ['polling', 'websocket'],
        autoConnect: true,
        reconnection: this.options.enableAutoReconnect !== false,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 2000,
        timeout: 15000,
        forceNew: true,
      });

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Failed to create socket connection'));
          return;
        }

        // Connection successful
        this.socket.on('connect', () => {
          console.log('🔌 [NotificationService] Connected to real-time notifications server:', {
            service: 'NotificationService',
            timestamp: new Date().toISOString(),
            event: 'connect',
            userId: userId,
            socketId: this.socket?.id,
            url: this.getWebSocketUrl(),
            reconnectAttempt: this.reconnectAttempts,
            isReconnect: this.reconnectAttempts > 0
          });
          
          this.isConnected = true;
          this.currentUserId = userId;
          this.reconnectAttempts = 0;
          
          // Join user-specific notification room
          this.joinUserRoom(userId);
          
          // Emit connect event to notify hook
          this.emit('connect');
          
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ [NotificationService] Connection error:', {
            service: 'NotificationService',
            timestamp: new Date().toISOString(),
            event: 'connect_error',
            userId: userId,
            error: error,
            errorMessage: error?.message || 'Unknown connection error',
            url: this.getWebSocketUrl(),
            reconnectAttempt: this.reconnectAttempts
          });
          
          // Emit connect_error event to notify hook
          this.emit('connect_error', error);
          
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 [NotificationService] Disconnected from real-time notifications:', {
            service: 'NotificationService',
            timestamp: new Date().toISOString(),
            event: 'disconnect',
            userId: this.currentUserId,
            socketId: this.socket?.id,
            reason: reason,
            wasConnected: this.isConnected
          });
          
          this.isConnected = false;
          
          // Emit disconnect event to notify hook
          this.emit('disconnect', reason);
          
          // Handle reconnection for unexpected disconnections
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            // Server forced disconnect or client called disconnect
            return;
          }
          
          this.handleReconnection();
        });

        // Set up notification listeners
        this.setupNotificationListeners();

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('❌ Failed to connect to notifications:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      if (this.currentUserId) {
        this.leaveUserRoom(this.currentUserId);
      }
      
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.currentUserId = null;
    this.reconnectAttempts = 0;
    console.log('🔌 Disconnected from notifications');
  }

  /**
   * Join user-specific notification room
   */
  private joinUserRoom(userId: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Cannot join room - not connected');
      return;
    }

    this.socket.emit('join_user_room', { userId });
  }

  /**
   * Leave user-specific notification room
   */
  private leaveUserRoom(userId: string): void {
    if (!this.socket) {
      return;
    }

    this.socket.emit('leave_user_room', { userId });
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
    if (!this.socket) return;

    // Room joined confirmation
    this.socket.on('joined_room', (data) => {
      console.log('✅ [NotificationService] Joined notifications room:', {
        service: 'NotificationService',
        timestamp: new Date().toISOString(),
        event: 'joined_room',
        userId: this.currentUserId,
        socketId: this.socket?.id,
        roomData: data
      });
      this.emit('joined_room', data);
    });

    // Wallet balance updates
    this.socket.on('wallet_balance_updated', (notification) => {
      console.log('🚨🚨🚨 [NOTIFICATION SERVICE] WALLET BALANCE EVENT RECEIVED FROM BACKEND 🚨🚨🚨');
      console.log('📡 [NotificationService] Raw socket event data:', JSON.stringify(notification, null, 2));
      console.log('🏦 [NotificationService] Balance update details:', {
        service: 'NotificationService',
        timestamp: new Date().toISOString(),
        event: 'wallet_balance_updated',
        userId: this.currentUserId,
        socketId: this.socket?.id,
        balanceData: {
          oldBalance: notification.oldBalance,
          newBalance: notification.newBalance,
          changeAmount: notification.change, // Backend uses "change" not "amount"
          transactionReference: notification.reference, // Backend uses "reference" not "transactionReference"
          accountNumber: notification.accountNumber,
          currency: notification.currency,
          timestamp: notification.timestamp,
        }
      });
      
      // Prominent balance change log  
      if (notification.change > 0) {
        console.log(`💰💰💰 [SOCKET] WALLET CREDITED: +₦${notification.change} | ₦${notification.oldBalance} → ₦${notification.newBalance}`);
      } else if (notification.change < 0) {
        console.log(`💸💸💸 [SOCKET] WALLET DEBITED: ₦${notification.change} | ₦${notification.oldBalance} → ₦${notification.newBalance}`);
      }
      
      this.emit('wallet_balance_updated', notification);
      
      console.log('📢 [NotificationService] Wallet balance update event emitted to CameraHeader component');
    });

    // Transaction notifications
    this.socket.on('transaction_notification', (notification) => {
      console.log('🚨🚨🚨 [NOTIFICATION SERVICE] TRANSACTION EVENT RECEIVED FROM BACKEND 🚨🚨🚨');
      console.log('📡 [NotificationService] Raw transaction event data:', JSON.stringify(notification, null, 2));
      console.log('💳 [NotificationService] Transaction details:', {
        service: 'NotificationService',
        timestamp: new Date().toISOString(),
        event: 'transaction_notification',
        userId: this.currentUserId,
        socketId: this.socket?.id,
        transactionData: {
          type: notification.type,
          amount: notification.amount,
          reference: notification.reference, // Backend uses "reference" not "transactionReference"
          currency: notification.currency,
          description: notification.description,
          status: notification.status,
          timestamp: notification.timestamp,
        }
      });
      
      console.log(`💳💳💳 [SOCKET] TRANSACTION ${notification.type?.toUpperCase()}: ₦${notification.amount} | Status: ${notification.status} | Ref: ${notification.reference}`);
      
      this.emit('transaction_notification', notification);
      
      console.log('📢 [NotificationService] Transaction notification event emitted to CameraHeader component');
    });

    // General notifications
    this.socket.on('notification', (notification) => {
      console.log('🔔 [NotificationService] Raw general notification received from server:', {
        service: 'NotificationService',
        timestamp: new Date().toISOString(),
        event: 'notification',
        userId: this.currentUserId,
        socketId: this.socket?.id,
        rawNotification: notification,
        notificationData: {
          title: notification.data?.title,
          message: notification.data?.message,
          type: notification.data?.type,
          metadata: notification.data?.metadata,
        }
      });
      
      this.emit('notification', notification);
      
      console.log('📢 [NotificationService] General notification event emitted to components');
    });
  }

  /**
   * Handle reconnection attempts
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      if (this.currentUserId) {
        this.reconnectAttempts++;
        try {
          await this.connect(this.currentUserId);
        } catch (error) {
          console.error('❌ Reconnection failed:', error);
          this.handleReconnection();
        }
      }
    }, delay) as unknown as NodeJS.Timeout;
  }

  /**
   * Add event listener
   */
  on<K extends keyof NotificationEventHandlers>(
    event: K,
    handler: NotificationEventHandlers[K]
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof NotificationEventHandlers>(
    event: K,
    handler: NotificationEventHandlers[K]
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to registered handlers
   */
  private emit<K extends keyof NotificationEventHandlers>(
    event: K,
    ...args: Parameters<NotificationEventHandlers[K]>
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      console.log(`📡 [NotificationService] Emitting '${event}' to ${handlers.size} registered handlers`);
      let handlerIndex = 0;
      handlers.forEach((handler) => {
        try {
          console.log(`🎯 [NotificationService] Calling handler #${handlerIndex + 1} for '${event}'`);
          (handler as any)(...args);
          console.log(`✅ [NotificationService] Handler #${handlerIndex + 1} for '${event}' completed successfully`);
        } catch (error) {
          console.error(`❌ [NotificationService] Error in handler #${handlerIndex + 1} for '${event}':`, error);
          console.error(`🔍 [NotificationService] Failed handler details:`, {
            event,
            handlerIndex: handlerIndex + 1,
            totalHandlers: handlers.size,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
        handlerIndex++;
      });
    } else {
      console.log(`📡 [NotificationService] No handlers registered for '${event}'`);
    }
  }

  /**
   * Get connection status
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

export default NotificationService; 