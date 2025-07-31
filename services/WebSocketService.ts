import { EventEmitter } from 'events';
import AuthStorageService from './AuthStorageService';
import { getApiBaseUrl } from '@/constants/config';

export interface LocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  altitude: number;
}

export interface ProximityResult {
  userId: string;
  locationId: string;
  locationName: string;
  distance: number;
  paymentDetails: any[];
  timestamp: number;
}

export interface NearbyPaymentLocation {
  userId: string;
  locationId: string;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  paymentSuggestions: any[];
  timestamp: number;
}

export interface LocationSubscription {
  userId: string;
  enabled: boolean;
  updateFrequency: number; // in seconds
  proximityRadius: number; // in meters
}

export interface LocationSettings {
  userId: string;
  locationNotificationsEnabled: boolean;
  updateFrequency: number;
  proximityRadius: number;
  lastUpdated: string;
}

export interface WebSocketError {
  type: 'LOCATION_NOTIFICATIONS_DISABLED' | 'CONNECTION_ERROR' | 'AUTHENTICATION_ERROR' | 'GENERAL_ERROR';
  message: string;
  code?: string;
  timestamp: number;
}

export interface AutoSubscriptionData {
  userId: string;
  enabled: boolean;
  message: string;
  timestamp: number;
}

class WebSocketService extends EventEmitter {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private isConnected = false;
  private userId: string | null = null;
  private locationUpdateInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastLocationUpdate: LocationUpdate | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<boolean> {
    if (this.isConnecting || this.isConnected) {
      console.log('🔌 WebSocket already connecting or connected');
      return this.isConnected;
    }

    try {
      this.isConnecting = true;
      console.log('🔌 Connecting to WebSocket server...');

      // Get user ID from auth service
      const authService = AuthStorageService.getInstance();
      const user = await authService.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      this.userId = user.id;

      // Connect to WebSocket using the same base URL as your existing setup
      const baseUrl = getApiBaseUrl();
      const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/notifications';
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Join user room (triggers auto-subscription if enabled)
        this.joinUserRoom();
        
        this.emit('connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        this.stopLocationUpdates();
        
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', { type: 'CONNECTION_ERROR', message: 'WebSocket connection error', timestamp: Date.now() });
      };

      return true;
    } catch (error) {
      console.error('❌ Error connecting to WebSocket:', error);
      this.isConnecting = false;
      this.emit('error', { type: 'CONNECTION_ERROR', message: error.message, timestamp: Date.now() });
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from WebSocket server...');
    
    this.stopHeartbeat();
    this.stopLocationUpdates();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnecting');
      this.socket = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.userId = null;
    
    this.emit('disconnected', { code: 1000, reason: 'Client disconnecting' });
  }

  /**
   * Join user room (triggers auto-subscription if locationNotificationsEnabled is true)
   */
  private joinUserRoom(): void {
    if (!this.isConnected || !this.userId) {
      console.warn('⚠️ Cannot join user room: not connected or no user ID');
      return;
    }

    const message = {
      event: 'join_user_room',
      data: { userId: this.userId }
    };

    this.sendMessage(message);
    console.log('👤 Joined user room:', this.userId);
  }

  /**
   * Send location update
   */
  sendLocationUpdate(location: Omit<LocationUpdate, 'userId'>): void {
    if (!this.isConnected || !this.userId) {
      console.warn('⚠️ Cannot send location update: not connected or no user ID');
      return;
    }

    const locationUpdate: LocationUpdate = {
      userId: this.userId,
      ...location
    };

    const message = {
      event: 'location:update',
      data: locationUpdate
    };

    this.sendMessage(message);
    this.lastLocationUpdate = locationUpdate;
    console.log('📍 Sent location update:', locationUpdate);
  }

  /**
   * Manually control location subscription
   */
  subscribeToLocationTracking(subscription: Omit<LocationSubscription, 'userId'>): void {
    if (!this.isConnected || !this.userId) {
      console.warn('⚠️ Cannot subscribe to location tracking: not connected or no user ID');
      return;
    }

    const fullSubscription: LocationSubscription = {
      userId: this.userId,
      ...subscription
    };

    const message = {
      event: 'location:subscribe',
      data: fullSubscription
    };

    this.sendMessage(message);
    console.log('📍 Sent location subscription:', fullSubscription);
  }

  /**
   * Start automatic location updates
   */
  startLocationUpdates(frequency: number = 35): void {
    if (this.locationUpdateInterval) {
      this.stopLocationUpdates();
    }

    console.log(`📍 Starting location updates every ${frequency} seconds`);
    
    this.locationUpdateInterval = setInterval(async () => {
      try {
        // Get current location from LocationService
        const LocationService = (await import('./LocationService')).default;
        const locationService = LocationService.getInstance();
        const location = await locationService.getCurrentLocation();
        
        if (location) {
          this.sendLocationUpdate({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: 10, // Default accuracy
            speed: 0, // Default speed
            heading: 0, // Default heading
            altitude: 0 // Default altitude
          });
        }
      } catch (error) {
        console.error('❌ Error getting location for update:', error);
      }
    }, frequency * 1000);
  }

  /**
   * Stop automatic location updates
   */
  stopLocationUpdates(): void {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
      console.log('📍 Stopped location updates');
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ event: 'ping', data: { timestamp: Date.now() } });
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message to WebSocket server
   */
  private sendMessage(message: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    console.log('📨 Received WebSocket message:', data);

    switch (data.event) {
      case 'location:proximity_result':
        this.handleProximityResult(data.data);
        break;
      
      case 'location:nearby_payment_location':
        this.handleNearbyPaymentLocation(data.data);
        break;
      
      case 'location:auto_subscribed':
        this.handleAutoSubscription(data.data);
        break;
      
      case 'location:error':
        this.handleLocationError(data.data);
        break;
      
      case 'pong':
        // Heartbeat response
        break;
      
      default:
        console.log('📨 Unknown WebSocket event:', data.event);
    }
  }

  /**
   * Handle proximity detection results
   */
  private handleProximityResult(data: ProximityResult): void {
    console.log('🎯 Proximity result received:', data);
    this.emit('proximity_result', data);
  }

  /**
   * Handle nearby payment location notifications
   */
  private handleNearbyPaymentLocation(data: NearbyPaymentLocation): void {
    console.log('💳 Nearby payment location received:', data);
    this.emit('nearby_payment_location', data);
  }

  /**
   * Handle auto-subscription confirmation
   */
  private handleAutoSubscription(data: AutoSubscriptionData): void {
    console.log('✅ Auto-subscription confirmed:', data);
    this.emit('auto_subscribed', data);
    
    // Start location updates if auto-subscribed
    if (data.enabled) {
      this.startLocationUpdates(35); // 35 seconds interval
    }
  }

  /**
   * Handle location tracking errors
   */
  private handleLocationError(data: WebSocketError): void {
    console.error('❌ Location tracking error:', data);
    this.emit('location_error', data);
    
    // Stop location updates if notifications are disabled
    if (data.type === 'LOCATION_NOTIFICATIONS_DISABLED') {
      this.stopLocationUpdates();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { isConnected: boolean; isConnecting: boolean; userId: string | null } {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      userId: this.userId
    };
  }

  /**
   * Get last location update
   */
  getLastLocationUpdate(): LocationUpdate | null {
    return this.lastLocationUpdate;
  }
}

export default WebSocketService; 