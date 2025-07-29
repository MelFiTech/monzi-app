/**
 * SME Plug Banks Service
 * Service for fetching banks from backend API (which uses SME Plug internally)
 */

import { Config } from '../constants/config';

class SMEPlugBanksService {
  private static readonly BANKS_ENDPOINT = '/accounts/banks';

  private static getBaseUrl(): string {
    return Config.API.getBaseUrl();
  }

  /**
   * Get banks from backend API (which uses SME Plug internally)
   */
  static async getBanks(): Promise<any[]> {
    try {
      console.log('🏦 Backend: Fetching banks via backend API...');
      console.log('📡 Backend: URL:', `${SMEPlugBanksService.getBaseUrl()}${SMEPlugBanksService.BANKS_ENDPOINT}`);

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Backend: Request timed out after 15 seconds');
      }, 15000);

              const response = await fetch(`${SMEPlugBanksService.getBaseUrl()}${SMEPlugBanksService.BANKS_ENDPOINT}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'MonziApp/1.0.0',
          },
          signal: controller.signal,
        });

      clearTimeout(timeoutId);

      console.log('📨 Backend: Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Backend: Response status:', data.status);
      console.log('🏦 Backend: Banks count:', data.banks?.length || 0);

      if (data.status && Array.isArray(data.banks)) {
        console.log(`✅ Backend: Successfully loaded ${data.banks.length} banks`);
        return data.banks;
      } else {
        throw new Error('Invalid response format: missing banks array');
      }
    } catch (error) {
      console.error('❌ Backend: Error fetching banks:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Backend banks request timed out after 15 seconds`);
        } else if (error.message.includes('Network request failed')) {
          throw new Error(`Backend network connectivity issue`);
        } else {
          throw new Error(`Backend error: ${error.message}`);
        }
      }
      
      throw new Error('Backend: Unknown error occurred');
    }
  }

  /**
   * Test network connectivity to backend API
   */
  static async testConnectivity(): Promise<{
    isReachable: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Backend: Testing connectivity...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${SMEPlugBanksService.getBaseUrl()}${SMEPlugBanksService.BANKS_ENDPOINT}`, {
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
      
      console.log(`✅ Backend: Connectivity test successful - ${latency}ms`);
      
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
      
      console.log(`❌ Backend: Connectivity test failed - ${errorMessage}`);
      
      return {
        isReachable: false,
        latency,
        error: errorMessage,
      };
    }
  }
}

export default SMEPlugBanksService; 