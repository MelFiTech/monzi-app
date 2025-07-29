import { Config } from '../constants/config';

interface AccountResolutionRequest {
  account_number: string;
  bank_name: string;
}

interface SuperResolveRequest {
  account_number: string;
}

interface SuperResolveResponse {
  success: boolean;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
  message: string;
  banks_tested?: number;
  execution_time?: number;
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
  // Bank-related endpoints have been moved to BankListService and BankResolutionService

  private static getBaseUrl(): string {
    console.log('🔧 getBaseUrl called');
    console.log('🔧 Config.API:', Config.API);
    console.log('🔧 Config.API.getBaseUrl:', Config.API.getBaseUrl);
    const url = Config.API.getBaseUrl();
    console.log('🔧 getBaseUrl returning:', url);
    return url;
  }

  // Bank resolution methods have been moved to BankResolutionService
  // Use BankResolutionService.resolveAccount() instead

  /**
   * Super resolve account number across all banks automatically
   * Tests the account number against all available banks and returns the first successful match
   */
  // Super resolve method has been moved to BankResolutionService
  // Use BankResolutionService.superResolveAccount() instead



  /**
   * Get list of supported banks from backend API
   */
  // Bank-related methods have been moved to BankListService and BankResolutionService
  // Use those services instead for bank operations

  /**
   * Check if account resolution is available (network connectivity test)
   */
  static async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${AccountService.getBaseUrl()}/health`, {
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
          const testEndpoint = `${AccountService.getBaseUrl()}/health`;
    
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
          baseUrl: AccountService.getBaseUrl(),
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
          baseUrl: AccountService.getBaseUrl(),
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