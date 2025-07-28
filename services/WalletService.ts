import { Config } from '../constants/config';
import AuthStorageService from './AuthStorageService';

// Wallet interfaces
export interface WalletDetails {
  id: string;
  balance: number;
  currency: string;
  virtualAccountNumber: string;
  providerAccountName: string;
  providerName: string;
  bankName: string;
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
  fee: number | null | {
    amount: number;
    currency: string;
    breakdown?: any;
  };
  createdAt: string;
  sender?: TransactionParticipant;
  receiver?: TransactionParticipant;
  // Additional fields for transaction details
  senderName?: string;
  senderAccount?: string;
  senderBank?: string;
  receiverName?: string;
  receiverAccount?: string;
  receiverBank?: string;
  currency?: string;
  updatedAt?: string;
  // New fields from the API response
  source?: {
    type: string;
    name: string;
    provider?: string;
    accountNumber: string;
    bankName?: string;
    bankCode?: string;
  };
  destination?: {
    type: string;
    name: string;
    accountNumber: string;
    provider?: string;
    bankName?: string;
    bankCode?: string;
  };
  balanceImpact?: number | null;
  timeline?: {
    createdAt: string;
    completedAt: string;
    updatedAt: string;
  };
  metadata?: {
    feeType?: string;
    provider?: string;
    eventType?: string;
    netAmount?: number;
    fundingFee?: number;
    grossAmount?: number;
    accountNumber?: string;
    webhookProcessedAt?: string;
    walletTransactionId?: string;
    // Additional fields for WITHDRAWAL transactions
    fee?: number;
    bankCode?: string;
    providerFee?: number;
    recipientBank?: string;
    recipientName?: string;
    recipientAccount?: string;
    providerStatus?: string;
    providerReference?: string;
  };
  providerReference?: string | null;
  providerResponse?: any | null;
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

export interface PinStatusResponse {
  hasPinSet: boolean;
  message: string;
  walletExists: boolean;
}

export interface TransferRequest {
  amount: number;
  accountNumber: string;
  bankName: string;
  accountName: string;
  description?: string;
  pin: string;
  // Location data for business payment tracking
  locationName?: string;
  locationLatitude?: number;
  locationLongitude?: number;
}

export interface TransferResponse {
  success: boolean;
  message: string;
  reference: string;
  amount: number;
  fee: number;
  newBalance: number;
  recipientName: string;
  recipientAccount: string;
  recipientBank: string;
  transactionId?: string; // Transaction ID for tagging
}

export interface WalletRecoveryResponse {
  success: boolean;
  message: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  provider: string;
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
      'ngrok-skip-browser-warning': 'true',
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
      
      console.log('🏦 Fetching wallet details...');
      
      const response = await fetch(`${this.baseUrl}/wallet/details`, {
        method: 'GET',
        headers,
      });

      const result = await this.handleResponse<WalletDetails>(response);
      
      console.log('✅ Wallet details response:', {
        id: result.id,
        accountNumber: result.virtualAccountNumber,
        bankName: result.bankName,
        providerName: result.providerName,
        isActive: result.isActive,
        balance: result.balance,
        currency: result.currency
      });
      
      return result;
    } catch (error) {
      console.error('❌ Get wallet details error:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<WalletBalance> {
    try {
      const headers = await this.getAuthHeaders();
      
      console.log('💰 Fetching wallet balance...');
      
      const response = await fetch(`${this.baseUrl}/wallet/balance`, {
        method: 'GET',
        headers,
      });

      const result = await this.handleResponse<WalletBalance>(response);
      
      console.log('✅ Wallet balance response:', {
        balance: result.balance,
        currency: result.currency,
        formattedBalance: result.formattedBalance
      });
      
      return result;
    } catch (error) {
      console.error('❌ Get wallet balance error:', error);
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
   * Get individual transaction details
   */
  async getTransactionDetail(transactionId: string): Promise<Transaction> {
    try {
      const headers = await this.getAuthHeaders();
      
      console.log('🔍 Fetching transaction details for ID:', transactionId);
      
      const response = await fetch(`${this.baseUrl}/auth/transactions/${transactionId}`, {
        method: 'GET',
        headers,
      });

      const result = await this.handleResponse<{ success: boolean; transaction: Transaction }>(response);
      
      console.log('✅ Transaction details response:', {
        id: result.transaction.id,
        amount: result.transaction.amount,
        type: result.transaction.type,
        status: result.transaction.status,
        reference: result.transaction.reference,
        description: result.transaction.description
      });
      
      return result.transaction;
    } catch (error) {
      console.error('❌ Get transaction detail error:', error);
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

      console.log('🔑 Setting wallet PIN...');

      const response = await fetch(`${this.baseUrl}/wallet/set-pin`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse<SetPinResponse>(response);
      
      console.log('✅ PIN set successfully:', {
        success: result.success,
        message: result.message
      });

      return result;
    } catch (error) {
      console.error('❌ Set wallet PIN error:', error);
      throw error;
    }
  }

  /**
   * Execute bank transfer
   */
  async transferFunds(data: TransferRequest): Promise<TransferResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      // Validate transfer data
      if (!data.amount || data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      if (!data.accountNumber || !data.bankName || !data.accountName) {
        throw new Error('Recipient details are required');
      }
      
      if (!data.pin || !/^\d{4,6}$/.test(data.pin)) {
        throw new Error('Valid PIN is required');
      }

      console.log('🚀 Initiating transfer:', {
        amount: data.amount,
        recipient: data.accountName,
        bank: data.bankName
      });

      // Debug: Log the exact payload being sent to the API
      console.log('📤 [WalletService] Transfer API payload:', {
        amount: data.amount,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        accountName: data.accountName,
        description: data.description,
        locationName: data.locationName,
        locationLatitude: data.locationLatitude,
        locationLongitude: data.locationLongitude,
        pin: '****'  // Don't log actual PIN
      });

      const response = await fetch(`${this.baseUrl}/wallet/transfer`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse<TransferResponse>(response);
      
      console.log('✅ Transfer completed:', {
        reference: result.reference,
        newBalance: result.newBalance
      });

      return result;
    } catch (error) {
      console.error('Transfer error:', error);
      throw error;
    }
  }

  /**
   * Trigger wallet recovery/activation
   */
  async retryWalletActivation(): Promise<WalletRecoveryResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      console.log('🔄 Triggering wallet recovery...');

      const response = await fetch(`${this.baseUrl}/wallet/retry-activation`, {
        method: 'POST',
        headers,
      });

      const result = await this.handleResponse<WalletRecoveryResponse>(response);
      
      console.log('✅ Wallet recovery successful:', {
        accountNumber: result.accountNumber,
        provider: result.provider
      });

      return result;
    } catch (error) {
      console.error('❌ Wallet recovery error:', error);
      throw error;
    }
  }

  /**
   * Check PIN status
   */
  async checkPinStatus(): Promise<PinStatusResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      console.log('🔑 Checking PIN status...');

      const response = await fetch(`${this.baseUrl}/wallet/pin/status`, {
        method: 'GET',
        headers,
      });

      const result = await this.handleResponse<PinStatusResponse>(response);
      
      console.log('✅ PIN status response:', {
        hasPinSet: result.hasPinSet,
        message: result.message,
        walletExists: result.walletExists
      });

      return result;
    } catch (error) {
      console.error('❌ PIN status error:', error);
      throw error;
    }
  }

  /**
   * Calculate transaction fee
   */
  async calculateFee({ amount, transactionType, provider }: { amount: number; transactionType: string; provider?: string }): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const payload: any = { amount, transactionType };
      if (provider) payload.provider = provider;
      
      console.log('🧮 Calculating transaction fee:', payload);
      const response = await fetch(`${this.baseUrl}/transactions/calculate-fee`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const result = await this.handleResponse<{ success: boolean; message: string; data: any }>(response);
      if (!result.success) throw new Error(result.message || 'Fee calculation failed');
      console.log('✅ Fee calculation response:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Fee calculation error:', error);
      throw error;
    }
  }

  /**
   * Tag transaction as business or personal
   */
  async tagTransaction(transactionId: string, isBusiness: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const headers = await this.getAuthHeaders();
      
      console.log('🏷️ Tagging transaction:', { transactionId, isBusiness });
      const response = await fetch(`${this.baseUrl}/wallet/tag-transaction`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transactionId,
          isBusiness,
        }),
      });
      
      const result = await this.handleResponse<{ success: boolean; message: string }>(response);
      console.log('✅ Transaction tagging response:', result);
      return result;
    } catch (error) {
      console.error('❌ Transaction tagging error:', error);
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