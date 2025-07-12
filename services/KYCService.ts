import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthStorageService from './AuthStorageService';
import { Config } from '../constants/config';

// Base API URL from centralized configuration
const API_BASE_URL = Config.API.getBaseUrl();

interface BVNVerificationRequest {
  bvn: string;
}

interface BVNVerificationResponse {
  success: boolean;
  message: string;
  kycStatus: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  walletCreated: boolean;
  error?: string;
  bvnData?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender: string;
    lgaOfOrigin: string;
    stateOfOrigin: string;
    residentialAddress: string;
  };
  verificationErrors?: string[];
}

interface SelfieUploadResponse {
  success: boolean;
  message: string;
  kycStatus: 'IN_PROGRESS' | 'VERIFIED' | 'APPROVED' | 'UNDER_REVIEW' | 'REJECTED';
  walletCreated?: boolean;
  selfieUrl?: string;
  verificationScore?: number;
  aiApprovalId?: string;
  error?: string;
}

export interface KYCStatusResponse {
  kycStatus: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  message: string;
  nextStep: 'bvn_verification' | 'selfie_upload' | 'contact_support' | 'wait_for_review' | null;
  isVerified: boolean;
  verifiedAt?: string;
  bvnVerified: boolean;
  selfieVerified: boolean;
}

// Helper function to get auth token
async function getAuthToken(): Promise<string> {
  const authStorageService = AuthStorageService.getInstance();
  const authData = await authStorageService.getAuthData();
  const token = authData?.accessToken;
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  return token;
}

// Helper function to make authenticated requests
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const token = await getAuthToken();
    
    // Log the request
    console.log(`🚀 KYC Request to ${endpoint}:`, {
      method: options.method || 'GET',
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token.substring(0, 20)}...`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.parse(options.body as string) : undefined,
    });
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      },
    });

    // Log the response
    console.log(`📥 KYC Response from ${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, clear auth data and redirect to login
        const authStorageService = AuthStorageService.getInstance();
        await authStorageService.clearAuthData();
        console.error('🚨 Token expired, clearing auth data');
        throw new Error('Authentication token expired');
      }
      
      const errorData = await response.json().catch(() => null);
      console.error(`❌ KYC Error Response from ${endpoint}:`, errorData);
      throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`✅ KYC Success Response from ${endpoint}:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`🚨 KYC API Error (${endpoint}):`, error);
    throw error;
  }
}

// BVN Verification (First Step)
export async function verifyBVN(data: BVNVerificationRequest): Promise<BVNVerificationResponse> {
  return makeRequest<BVNVerificationResponse>('/kyc/verify-bvn', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Selfie Upload (Second Step)
export async function uploadSelfie(selfieFile: File | any): Promise<SelfieUploadResponse> {
  try {
    const token = await getAuthToken();
    
    const formData = new FormData();
    formData.append('selfie', selfieFile);

    // Log the request
    console.log(`🚀 KYC Selfie Upload Request:`, {
      method: 'POST',
      url: `${API_BASE_URL}/kyc/upload-selfie`,
      headers: {
        'Authorization': `Bearer ${token.substring(0, 20)}...`,
      },
      body: 'FormData with selfie file',
      fileInfo: {
        name: selfieFile?.name || 'unknown',
        type: selfieFile?.type || 'unknown',
        size: selfieFile?.size || 'unknown',
      }
    });

    const response = await fetch(`${API_BASE_URL}/kyc/upload-selfie`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      body: formData,
    });

    // Log the response
    console.log(`📥 KYC Selfie Upload Response:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, clear auth data and redirect to login
        const authStorageService = AuthStorageService.getInstance();
        await authStorageService.clearAuthData();
        console.error('🚨 Token expired during selfie upload, clearing auth data');
        throw new Error('Authentication token expired');
      }
      
      const errorData = await response.json().catch(() => null);
      console.error(`❌ KYC Selfie Upload Error Response:`, errorData);
      throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`✅ KYC Selfie Upload Success Response:`, responseData);
    return responseData;
  } catch (error) {
    console.error('🚨 Selfie Upload Error:', error);
    throw error;
  }
}

// KYC Status Check
export async function getKYCStatus(): Promise<KYCStatusResponse> {
  return makeRequest<KYCStatusResponse>('/kyc/status');
}

// Helper function to check if user can proceed to next step
export function getNextStepFromStatus(status: KYCStatusResponse['kycStatus']): string {
  switch (status) {
    case 'PENDING':
      return 'Please verify your BVN to start the verification process.';
    case 'IN_PROGRESS':
      return 'BVN verified. Please upload your selfie to complete verification.';
    case 'VERIFIED':
    case 'APPROVED':
      return 'Your account is fully verified and ready to use.';
    case 'REJECTED':
      return 'Verification failed. Please contact support for assistance.';
    case 'UNDER_REVIEW':
      return 'Your verification is under review. We\'ll notify you once complete.';
    default:
      return 'Unknown verification status.';
  }
}

// Helper function to determine which screen to show
export function getScreenForStatus(status: KYCStatusResponse['kycStatus']): string {
  switch (status) {
    case 'PENDING':
      return '/(kyc)/bvn';
    case 'IN_PROGRESS':
      return '/(kyc)/bridge';
    case 'VERIFIED':
    case 'APPROVED':
      return '/(tabs)';
    case 'REJECTED':
    case 'UNDER_REVIEW':
      return '/(kyc)/bridge';
    default:
      return '/(kyc)/bvn';
  }
}

// Export all functions as a default object for backward compatibility
const KYCService = {
  verifyBVN,
  uploadSelfie,
  getKYCStatus,
  getNextStepFromStatus,
  getScreenForStatus,
};

export default KYCService; 