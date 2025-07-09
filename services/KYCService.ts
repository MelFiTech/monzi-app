import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/config';

// Base API URL from centralized configuration
const API_BASE_URL = Config.API.getBaseUrl();

interface BVNVerificationRequest {
  bvn: string;
}

interface BVNVerificationResponse {
  success: boolean;
  message: string;
  kycStatus: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW';
  walletCreated: boolean;
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
  kycStatus: 'IN_PROGRESS' | 'VERIFIED' | 'UNDER_REVIEW';
  walletCreated: boolean;
  selfieUrl?: string;
  verificationScore?: number;
  aiApprovalId?: string;
  error?: string;
}

interface KYCStatusResponse {
  kycStatus: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW';
  message: string;
  nextStep: 'bvn_verification' | 'selfie_upload' | 'contact_support' | 'wait_for_review' | null;
  isVerified: boolean;
  verifiedAt?: string;
  bvnVerified: boolean;
  selfieVerified: boolean;
}

// Helper function to get auth token
async function getAuthToken(): Promise<string> {
  const token = await AsyncStorage.getItem('auth_token');
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
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, redirect to login
        await AsyncStorage.removeItem('auth_token');
        throw new Error('Authentication token expired');
      }
      
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`KYC API Error (${endpoint}):`, error);
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

    const response = await fetch(`${API_BASE_URL}/kyc/upload-selfie`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.removeItem('auth_token');
        throw new Error('Authentication token expired');
      }
      
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Selfie Upload Error:', error);
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