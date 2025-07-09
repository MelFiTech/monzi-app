import { Config } from '../constants/config';
import { AuthStorageService } from './AuthStorageService';

// Wallet interfaces
export interface WalletDetails {
  id: string;
  balance: number;
  currency: string;
  virtualAccountNumber: string;
  providerAccountName: string;
  isActive: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  createdAt: string;
}

export interface WalletBalance {
  balance: number;
  currency: string;
  formattedBalance: string;
}

export interface TransactionParticipant {
  name: string;
  accountNumber: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  reference: string;
  description: string;
  fee: number;
  createdAt: string;
  sender?: TransactionParticipant;
  receiver?: TransactionParticipant;
}

export interface TransactionHistoryParams {
  limit?: number;
  offset?: number;
}

export interface SetPinRequest {
  pin: string;
}

export interface SetPinResponse {
  success: boolean;
  message: string;
}

export interface WalletError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

class WalletService {
  private static instance: WalletService;
  private baseUrl: string;
  private authStorageService: AuthStorageService;

  constructor() {
    this.baseUrl = Config.API.getBaseUrl();
    this.authStorageService = AuthStorageService.getInstance();
  }

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Get authentication headers for API requests
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const authData = await this.authStorageService.getAuthData();
    const token = authData?.accessToken;
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: any = {};
      
      try {
        errorData = await response.json();
      } catch (e) {
        // Ignore JSON parsing errors
      }

      throw {
        error: 'Wallet API Error',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        details: errorData.details,
      } as WalletError;
    }

    return await response.json();
  }

  /**
   * Get wallet details
   */
  async getWalletDetails(): Promise<WalletDetails> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/wallet/details`, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse<WalletDetails>(response);
    } catch (error) {
      console.error('Get wallet details error:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<WalletBalance> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/wallet/balance`, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse<WalletBalance>(response);
    } catch (error) {
      console.error('Get wallet balance error:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(params: TransactionHistoryParams = {}): Promise<Transaction[]> {
    try {
      const headers = await this.getAuthHeaders();
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.offset !== undefined) {
        queryParams.append('offset', params.offset.toString());
      }

      const url = `${this.baseUrl}/wallet/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse<Transaction[]>(response);
    } catch (error) {
      console.error('Get transaction history error:', error);
      throw error;
    }
  }

  /**
   * Set or update wallet PIN
   */
  async setWalletPin(data: SetPinRequest): Promise<SetPinResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      // Validate PIN format (should be 4-6 digits)
      if (!/^\d{4,6}$/.test(data.pin)) {
        throw new Error('PIN must be 4-6 digits');
      }

      const response = await fetch(`${this.baseUrl}/wallet/pin`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      return await this.handleResponse<SetPinResponse>(response);
    } catch (error) {
      console.error('Set wallet PIN error:', error);
      throw error;
    }
  }

  /**
   * Format currency amount for display
   */
  static formatCurrency(amount: number, currency: string = 'NGN'): string {
    if (currency === 'NGN') {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
      }).format(amount);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Get transaction type display text
   */
  static getTransactionTypeText(type: Transaction['type']): string {
    switch (type) {
      case 'DEPOSIT':
        return 'Money In';
      case 'WITHDRAWAL':
        return 'Money Out';
      case 'TRANSFER':
        return 'Transfer';
      default:
        return type;
    }
  }

  /**
   * Get transaction status display text and color
   */
  static getTransactionStatus(status: Transaction['status']): { text: string; color: string } {
    switch (status) {
      case 'COMPLETED':
        return { text: 'Completed', color: '#10B981' }; // green
      case 'PENDING':
        return { text: 'Pending', color: '#F59E0B' }; // yellow
      case 'FAILED':
        return { text: 'Failed', color: '#EF4444' }; // red
      case 'CANCELLED':
        return { text: 'Cancelled', color: '#6B7280' }; // gray
      default:
        return { text: status, color: '#6B7280' };
    }
  }
}

export default WalletService; 