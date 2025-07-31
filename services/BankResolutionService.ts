import { Config } from '../constants/config';

interface AccountResolutionRequest {
  account_number: string;
  bank_name: string;
}

interface SuperResolveRequest {
  account_number: string;
}

interface AccountResolutionResponse {
  status: boolean;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
  message: string;
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

interface AccountResolutionError {
  status: false;
  message: string;
  error?: string;
}

type AccountResolutionResult = AccountResolutionResponse | AccountResolutionError;

class BankResolutionService {
  private static readonly RESOLVE_ENDPOINT = '/accounts/resolve';
  private static readonly SUPER_RESOLVE_ENDPOINT = '/accounts/super-resolve';

  private static getBaseUrl(): string {
    return Config.API.getBaseUrl();
  }

  /**
   * Resolve account name using account number and bank name
   */
  static async resolveAccount(
    accountNumber: string, 
    bankName: string
  ): Promise<AccountResolutionResponse> {
    try {
      console.log('🔍 BankResolutionService: Resolving account:', { accountNumber, bankName });

      const requestBody: AccountResolutionRequest = {
        account_number: accountNumber,
        bank_name: bankName,
      };

      const response = await fetch(`${BankResolutionService.getBaseUrl()}${BankResolutionService.RESOLVE_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'MonziApp/1.0.0',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AccountResolutionResult = await response.json();

      console.log('📦 BankResolutionService: Account resolution response:', data);

      if (!data.status) {
        throw new Error(data.message || 'Account resolution failed');
      }

      const successData = data as AccountResolutionResponse;
      
      console.log('✅ BankResolutionService: Account resolved successfully:', {
        accountName: successData.account_name,
        bankName: successData.bank_name,
      });

      return successData;
    } catch (error) {
      console.error('❌ BankResolutionService: Account resolution error:', error);
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to resolve account: ${error.message}`);
      }
      
      throw new Error('Failed to resolve account: Unknown error');
    }
  }

  /**
   * Super resolve account number across all banks automatically
   * Tests the account number against all available banks and returns the first successful match
   * DISABLED - Only use normal resolve with bank name and account number
   */
  /*
  static async superResolveAccount(accountNumber: string): Promise<AccountResolutionResponse> {
    try {
      console.log('🚀 BankResolutionService: Super resolving account:', { accountNumber });

      const requestBody: SuperResolveRequest = {
        account_number: accountNumber,
      };

      const response = await fetch(`${BankResolutionService.getBaseUrl()}${BankResolutionService.SUPER_RESOLVE_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'MonziApp/1.0.0',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SuperResolveResponse = await response.json();

      console.log('📦 BankResolutionService: Super resolve response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Super resolve failed');
      }

      // Convert the response to our expected format
      const successData: AccountResolutionResponse = {
        status: data.success,
        account_name: data.account_name,
        account_number: data.account_number,
        bank_name: data.bank_name,
        bank_code: data.bank_code,
        message: data.message,
      };

      console.log('✅ BankResolutionService: Super resolve successful:', {
        accountName: successData.account_name,
        bankName: successData.bank_name,
        banksTested: data.banks_tested,
        executionTime: data.execution_time,
      });

      return successData;
    } catch (error) {
      console.error('❌ BankResolutionService: Super resolve error:', error);
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to super resolve account: ${error.message}`);
      }
      
      throw new Error('Failed to super resolve account: Unknown error');
    }
  }
  */

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

export default BankResolutionService;
export type { 
  AccountResolutionRequest, 
  AccountResolutionResponse, 
  AccountResolutionError,
  AccountResolutionResult,
  SuperResolveRequest,
  SuperResolveResponse
}; 