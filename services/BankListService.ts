import { Config } from '../constants/config';

interface Bank {
  name: string;
  code: string;
}

interface BankListResponse {
  status: boolean;
  banks: Bank[];
}

class BankListService {
  private static readonly BANKS_ENDPOINT = '/accounts/banks';

  private static getBaseUrl(): string {
    return Config.API.getBaseUrl();
  }

  /**
   * Fetch the list of all available banks
   */
  static async getBanks(): Promise<Bank[]> {
    const baseUrl = BankListService.getBaseUrl();
    const endpoint = BankListService.BANKS_ENDPOINT;
    const fullUrl = `${baseUrl}${endpoint}`;
    
    console.log('🏦 BankListService: Fetching banks...');
    console.log('📍 URL:', fullUrl);
    console.log('🔧 Environment:', __DEV__ ? 'Development' : 'Production');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Bank list request timed out after 15 seconds');
      }, 15000);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'MonziApp/1.0.0',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📨 Response received:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const data: BankListResponse = await response.json();
      console.log('📦 Response data:', { status: data.status, banksCount: data.banks?.length });

      if (data.status && Array.isArray(data.banks)) {
        console.log(`✅ BankListService: Found ${data.banks.length} banks`);
        return data.banks;
      } else {
        throw new Error('Invalid response format: missing banks array');
      }
    } catch (error) {
      console.error('❌ BankListService: Failed to fetch banks:', error);
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        url: fullUrl,
        environment: __DEV__ ? 'Development' : 'Production'
      });
      
      // Try fallback approaches
      console.log('🔄 Trying fallback approaches...');
      
      // Fallback 1: Try production URL
      try {
        console.log('🔄 Fallback 1: Trying production URL...');
        const productionUrl = 'https://monzi-backend.onrender.com';
        const fallbackUrl = `${productionUrl}${endpoint}`;
        
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MonziApp/1.0.0',
          },
        });
        
        if (fallbackResponse.ok) {
          const fallbackData: BankListResponse = await fallbackResponse.json();
          if (fallbackData.status && Array.isArray(fallbackData.banks)) {
            console.log(`✅ Fallback 1 successful: Found ${fallbackData.banks.length} banks`);
            return fallbackData.banks;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback 1 failed:', fallbackError);
      }
      
      // Fallback 2: Try without ngrok headers
      try {
        console.log('🔄 Fallback 2: Trying without ngrok headers...');
        const fallbackResponse = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MonziApp/1.0.0',
          },
        });
        
        if (fallbackResponse.ok) {
          const fallbackData: BankListResponse = await fallbackResponse.json();
          if (fallbackData.status && Array.isArray(fallbackData.banks)) {
            console.log(`✅ Fallback 2 successful: Found ${fallbackData.banks.length} banks`);
            return fallbackData.banks;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback 2 failed:', fallbackError);
      }
      
      // Fallback 3: Try minimal headers
      try {
        console.log('🔄 Fallback 3: Trying minimal headers...');
        const fallbackResponse = await fetch(fullUrl, {
          method: 'GET',
        });
        
        if (fallbackResponse.ok) {
          const fallbackData: BankListResponse = await fallbackResponse.json();
          if (fallbackData.status && Array.isArray(fallbackData.banks)) {
            console.log(`✅ Fallback 3 successful: Found ${fallbackData.banks.length} banks`);
            return fallbackData.banks;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback 3 failed:', fallbackError);
      }
      
      throw error;
    }
  }

  /**
   * Test network connectivity to bank list endpoint
   */
  static async testConnectivity(): Promise<{
    isReachable: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 BankListService: Testing connectivity...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${BankListService.getBaseUrl()}${BankListService.BANKS_ENDPOINT}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`✅ BankListService: Connectivity test successful - ${latency}ms`);
      
      return {
        isReachable: response.ok,
        latency,
      };
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.log(`❌ BankListService: Connectivity test failed - ${errorMessage}`);
      
      return {
        isReachable: false,
        latency,
        error: errorMessage,
      };
    }
  }
}

export default BankListService;
export type { Bank, BankListResponse }; 