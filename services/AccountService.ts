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
  private static readonly BASE_URL = 'http://localhost:3000';
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
   * Get list of supported banks (for future use)
   */
  static async getBanks(): Promise<any[]> {
    try {
      console.log('🏦 Fetching banks list...');

      const response = await fetch(`${this.BASE_URL}${this.BANKS_ENDPOINT}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Banks list response:', data);

      return data;
    } catch (error) {
      console.error('❌ Banks list error:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch banks: ${error.message}`);
      }
      
      throw new Error('Failed to fetch banks: Unknown error');
    }
  }

  /**
   * Check if account resolution is available (network connectivity test)
   */
  static async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      });
      
      return response.ok;
    } catch (error) {
      console.log('⚠️ Account service unavailable:', error);
      return false;
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