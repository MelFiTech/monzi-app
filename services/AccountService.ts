import { Config } from '../constants/config';
import SMEPlugBanksService from './SMEPlugBanksService';

interface AccountResolutionRequest {
  account_number: string;
  bank_name: string;
}

interface AccountResolutionResponse {
  status: boolean;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
  message: string;
}

interface AccountResolutionError {
  status: false;
  message: string;
  error?: string;
}

type AccountResolutionResult = AccountResolutionResponse | AccountResolutionError;

class AccountService {
  private static readonly BASE_URL = Config.API.getBaseUrl();
  private static readonly RESOLVE_ENDPOINT = '/accounts/resolve';
  private static readonly BANKS_ENDPOINT = '/accounts/banks';

  /**
   * Resolve account name using account number and bank name
   */
  static async resolveAccount(
    accountNumber: string, 
    bankName: string
  ): Promise<AccountResolutionResponse> {
    try {
      console.log('🔍 Resolving account:', { accountNumber, bankName });

      const requestBody: AccountResolutionRequest = {
        account_number: accountNumber,
        bank_name: bankName,
      };

      const response = await fetch(`${this.BASE_URL}${this.RESOLVE_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AccountResolutionResult = await response.json();

      console.log('📦 Account resolution response:', data);

      if (!data.status) {
        throw new Error(data.message || 'Account resolution failed');
      }

      const successData = data as AccountResolutionResponse;
      
      console.log('✅ Account resolved successfully:', {
        accountName: successData.account_name,
        bankName: successData.bank_name,
      });

      return successData;
    } catch (error) {
      console.error('❌ Account resolution error:', error);
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to resolve account: ${error.message}`);
      }
      
      throw new Error('Failed to resolve account: Unknown error');
    }
  }



  /**
   * Get list of supported banks with fallback strategy
   * Primary: SME Plug API (more reliable)
   * Fallback: Current backend
   */
  static async getBanks(): Promise<any[]> {
    console.log('🎯 Starting intelligent banks fetch with fallback strategy...');
    
    // Try SME Plug first (primary source)
    try {
      console.log('1️⃣ Trying SME Plug API (primary)...');
      const banks = await SMEPlugBanksService.getBanks();
      console.log('✅ SME Plug banks fetch successful');
      return banks;
    } catch (smePlugError) {
      console.log('⚠️ SME Plug failed, trying backend fallback...');
      console.error('SME Plug error:', smePlugError);
      
      // Try backend as fallback
      try {
        console.log('2️⃣ Trying backend API (fallback)...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.log('⏰ Backend banks request timed out after 15 seconds');
        }, 15000);

        const response = await fetch(`${this.BASE_URL}${this.BANKS_ENDPOINT}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'MonziApp/1.0.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status && Array.isArray(data.banks)) {
          console.log(`✅ Backend: Found ${data.banks.length} banks`);
          return data.banks;
        } else {
          throw new Error('Invalid response format: missing banks array');
        }
      } catch (backendError) {
        console.error('❌ Both SME Plug and backend failed');
        console.error('Backend error:', backendError);
        
        // Both failed, throw comprehensive error
        throw new Error(`Failed to fetch banks from both sources. SME Plug: ${smePlugError instanceof Error ? smePlugError.message : 'Unknown error'}. Backend: ${backendError instanceof Error ? backendError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Check if account resolution is available (network connectivity test)
   */
  static async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/health`, {
        method: 'GET',
      });
      
      return response.ok;
    } catch (error) {
      console.log('⚠️ Account service unavailable:', error);
      return false;
    }
  }

  /**
   * Comprehensive network connectivity test
   */
  static async testNetworkConnectivity(): Promise<{
    isReachable: boolean;
    latency: number;
    error?: string;
    details: {
      baseUrl: string;
      endpoint: string;
      userAgent: string;
      timestamp: string;
    };
  }> {
    const startTime = Date.now();
    const testEndpoint = `${this.BASE_URL}/health`;
    
    console.log('🔍 Testing network connectivity...');
    console.log('📍 Testing endpoint:', testEndpoint);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(testEndpoint, {
        method: 'GET',
        headers: {
          'User-Agent': 'MonziApp/1.0.0',
          'ngrok-skip-browser-warning': 'true',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`✅ Network test successful - Status: ${response.status}, Latency: ${latency}ms`);
      
      return {
        isReachable: response.ok,
        latency,
        details: {
          baseUrl: this.BASE_URL,
          endpoint: testEndpoint,
          userAgent: 'MonziApp/1.0.0',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connectivity issue';
        } else {
          errorMessage = error.message;
        }
      }
      
      console.log(`❌ Network test failed - Error: ${errorMessage}, Latency: ${latency}ms`);
      
      return {
        isReachable: false,
        latency,
        error: errorMessage,
        details: {
          baseUrl: this.BASE_URL,
          endpoint: testEndpoint,
          userAgent: 'MonziApp/1.0.0',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Validate account number format
   */
  static isValidAccountNumber(accountNumber: string): boolean {
    // Remove spaces and check if it's all digits
    const cleaned = accountNumber.replace(/\s+/g, '');
    return /^\d{10}$/.test(cleaned); // Nigerian account numbers are typically 10 digits
  }

  /**
   * Validate bank name format
   */
  static isValidBankName(bankName: string): boolean {
    return bankName.trim().length > 0;
  }

  /**
   * Clean account number for API call
   */
  static cleanAccountNumber(accountNumber: string): string {
    return accountNumber.replace(/\s+/g, '');
  }

  /**
   * Clean bank name for API call
   */
  static cleanBankName(bankName: string): string {
    return bankName.trim();
  }
}

export default AccountService;
export type { 
  AccountResolutionRequest, 
  AccountResolutionResponse, 
  AccountResolutionError,
  AccountResolutionResult 
}; 