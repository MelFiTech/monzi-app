/**
 * SME Plug Banks Service
 * Standalone service for fetching banks from SME Plug API
 */

class SMEPlugBanksService {
  private static readonly BASE_URL = 'https://smeplug.ng/api/v1';
  private static readonly BANKS_ENDPOINT = '/transfer/banks';
  private static readonly API_KEY = 'ed4155359e54d7d9ee3e7b5726829ba16666aa8c074fbfde643a096cef486c7f';

  /**
   * Get banks from SME Plug API
   */
  static async getBanks(): Promise<any[]> {
    try {
      console.log('🏦 SMEPlug: Fetching banks...');
      console.log('📡 SMEPlug: URL:', `${this.BASE_URL}${this.BANKS_ENDPOINT}`);

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ SMEPlug: Request timed out after 15 seconds');
      }, 15000);

      const response = await fetch(`${this.BASE_URL}${this.BANKS_ENDPOINT}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MonziApp/1.0.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📨 SMEPlug: Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 SMEPlug: Response status:', data.status);
      console.log('🏦 SMEPlug: Banks count:', data.banks?.length || 0);

      if (data.status && Array.isArray(data.banks)) {
        console.log(`✅ SMEPlug: Successfully loaded ${data.banks.length} banks`);
        return data.banks;
      } else {
        throw new Error('Invalid response format: missing banks array');
      }
    } catch (error) {
      console.error('❌ SMEPlug: Error fetching banks:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`SME Plug banks request timed out after 15 seconds`);
        } else if (error.message.includes('Network request failed')) {
          throw new Error(`SME Plug network connectivity issue`);
        } else {
          throw new Error(`SME Plug error: ${error.message}`);
        }
      }
      
      throw new Error('SME Plug: Unknown error occurred');
    }
  }

  /**
   * Test network connectivity to SME Plug
   */
  static async testConnectivity(): Promise<{
    isReachable: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 SMEPlug: Testing connectivity...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.BASE_URL}${this.BANKS_ENDPOINT}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`✅ SMEPlug: Connectivity test successful - ${latency}ms`);
      
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
      
      console.log(`❌ SMEPlug: Connectivity test failed - ${errorMessage}`);
      
      return {
        isReachable: false,
        latency,
        error: errorMessage,
      };
    }
  }
}

export default SMEPlugBanksService; 