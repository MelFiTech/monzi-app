import { Config } from '@/constants/config';

export interface Service {
  id: string;
  service: string;
  category: string;
}

export interface DataPlan {
  bundle_id: string;
  amount: string;
  data_bundle: string;
  validity: string;
}

export interface AirtimePurchaseRequest {
  phoneNumber: string;
  amount: number;
  network: string;
  pin: string;
}

export interface DataPurchaseRequest {
  phoneNumber: string;
  bundleId: string;
  amount: number;
  pin: string;
  network: string;
}

export interface PurchaseResponse {
  success: boolean;
  reference: string;
  amount: number;
  status: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

class BillsService {
  private getHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getAvailableServices(token: string): Promise<Service[]> {
    try {
      const response = await fetch(`${Config.API.getBaseUrl()}/bills/services`, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<Service[]> = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching available services:', error);
      throw error;
    }
  }

  async getDataPlansByNetwork(network: string, token: string): Promise<DataPlan[]> {
    try {
      const response = await fetch(`${Config.API.getBaseUrl()}/bills/data-plans?network=${network}`, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<DataPlan[]> = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching data plans:', error);
      throw error;
    }
  }

  async purchaseAirtime(request: AirtimePurchaseRequest, token: string): Promise<PurchaseResponse> {
    try {
      const response = await fetch(`${Config.API.getBaseUrl()}/bills/airtime/purchase`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<PurchaseResponse> = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error purchasing airtime:', error);
      throw error;
    }
  }

  async purchaseData(request: DataPurchaseRequest, token: string): Promise<PurchaseResponse> {
    try {
      const response = await fetch(`${Config.API.getBaseUrl()}/bills/data/purchase`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<PurchaseResponse> = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error purchasing data:', error);
      throw error;
    }
  }
}

export default new BillsService();
