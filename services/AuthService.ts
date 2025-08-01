import { Config } from '../constants/config';

// Auth API Service with React Query integration
export interface RegisterRequest {
  email: string;
  phone: string; // Should be in +234XXXXXXXXXX format
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string; // YYYY-MM-DD format
  passcode: string; // 6-digit numeric
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  phone?: string;
  otpExpiresAt?: string;
  data?: {
    userId: string;
    email: string;
    phone: string;
    requiresOtpVerification: boolean;
  };
}

export interface LoginRequest {
  email: string;
  passcode: string; // 6-digit numeric
}

export interface LoginResponse {
  success: boolean;
  message: string;
  access_token?: string;
  user?: UserProfile;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
    expiresIn: number;
  };
}

export interface VerifyOtpRequest {
  phone: string; // Email address (keeping phone field name for backend compatibility)
  otpCode: string; // 6-digit Email OTP
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  access_token?: string;
  user?: UserProfile;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
    expiresIn: number;
  };
}

export interface ResendOtpRequest {
  phone: string; // Email address (keeping phone field name for backend compatibility)
}

export interface ResendOtpResponse {
  success: boolean;
  message: string;
  data?: {
    otpSent: boolean;
    nextResendAvailable: number; // Unix timestamp
  };
}

export interface RequestAccountDeletionRequest {
  reason: string;
}

export interface RequestAccountDeletionResponse {
  success: boolean;
  message: string;
  expiresAt: string;
}

export interface ConfirmAccountDeletionRequest {
  otpCode: string;
  reason?: string;
}

export interface ConfirmAccountDeletionResponse {
  success: boolean;
  message: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  firstName: string | null;
  lastName: string | null;
  isVerified: boolean;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
}

export interface AuthError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

class AuthService {
  private static instance: AuthService;
  private baseUrl: string;

  constructor() {
    // Use centralized configuration for API base URL
    this.baseUrl = Config.API.getBaseUrl();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Format phone number to +234XXXXXXXXXX format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    
    // Handle different input formats
    if (digitsOnly.startsWith('234')) {
      return `+${digitsOnly}`;
    } else if (digitsOnly.startsWith('0')) {
      // Remove leading zero and add +234
      return `+234${digitsOnly.substring(1)}`;
    } else {
      // Assume it's already in correct format without +234
      return `+234${digitsOnly}`;
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate Nigerian phone number
   */
  private validatePhoneNumber(phone: string): boolean {
    const formattedPhone = this.formatPhoneNumber(phone);
    // Nigerian phone numbers are +234 followed by 10 digits
    const phoneRegex = /^\+234[0-9]{10}$/;
    return phoneRegex.test(formattedPhone);
  }

  /**
   * Validate 6-digit passcode
   */
  private validatePasscode(passcode: string): boolean {
    const passcodeRegex = /^[0-9]{6}$/;
    return passcodeRegex.test(passcode);
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      // Validate input data
      if (!this.validateEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      if (!this.validatePhoneNumber(data.phone)) {
        throw new Error('Invalid Nigerian phone number format');
      }

      if (!this.validatePasscode(data.passcode)) {
        throw new Error('Passcode must be exactly 6 digits');
      }

      if (!['MALE', 'FEMALE', 'OTHER'].includes(data.gender)) {
        throw new Error('Invalid gender selection');
      }

      // Format the phone number
      const formattedData = {
        ...data,
        phone: this.formatPhoneNumber(data.phone),
        email: data.email.trim().toLowerCase(),
      };

      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(formattedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw {
          error: 'Registration failed',
          message: result.message || 'Registration failed',
          statusCode: response.status,
          details: result.details,
        } as AuthError;
      }

      // Transform API response to match our interface
      return {
        success: true,
        message: result.message,
        phone: result.phone,
        otpExpiresAt: result.otpExpiresAt,
        data: {
          userId: result.userId || '',
          email: formattedData.email,
          phone: result.phone,
          requiresOtpVerification: true,
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw {
          error: 'Registration failed',
          message: error.message,
          statusCode: 400,
        } as AuthError;
      }
      throw error;
    }
  }

  /**
   * Login user with email and passcode
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      // Validate input data
      if (!this.validateEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      if (!this.validatePasscode(data.passcode)) {
        throw new Error('Passcode must be exactly 6 digits');
      }

      const formattedData = {
        email: data.email.trim().toLowerCase(),
        passcode: data.passcode,
      };

      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(formattedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw {
          error: 'Login failed',
          message: result.message || 'Login failed',
          statusCode: response.status,
          details: result.details,
        } as AuthError;
      }

      // Transform API response to match our interface
      return {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: result.access_token,
          refreshToken: result.refresh_token || '',
          user: result.user,
          expiresIn: 604800, // 7 days in seconds
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw {
          error: 'Login failed',
          message: error.message,
          statusCode: 400,
        } as AuthError;
      }
      throw error;
    }
  }

  /**
   * Verify Email OTP
   */
  async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    try {
      // Validate input data
      if (!this.validateEmail(data.phone)) {
        throw new Error('Invalid email format');
      }

      if (!/^[0-9]{6}$/.test(data.otpCode)) {
        throw new Error('OTP must be exactly 6 digits');
      }

      const formattedData = {
        email: data.phone.trim().toLowerCase(), // Send email field instead of phone
        otpCode: data.otpCode,
      };

      const response = await fetch(`${this.baseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(formattedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw {
          error: 'OTP verification failed',
          message: result.message || 'OTP verification failed',
          statusCode: response.status,
          details: result.details,
        } as AuthError;
      }

      // Transform API response to match our interface
      return {
        success: true,
        message: 'OTP verification successful',
        data: {
          accessToken: result.access_token,
          refreshToken: result.refresh_token || '',
          user: result.user,
          expiresIn: 604800, // 7 days in seconds
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw {
          error: 'OTP verification failed',
          message: error.message,
          statusCode: 400,
        } as AuthError;
      }
      throw error;
    }
  }

  /**
   * Resend Email OTP
   */
  async resendOtp(data: ResendOtpRequest): Promise<ResendOtpResponse> {
    try {
      // Validate input data
      if (!this.validateEmail(data.phone)) {
        throw new Error('Invalid email format');
      }

      const formattedData = {
        email: data.phone.trim().toLowerCase(), // Send email field instead of phone
      };

      const response = await fetch(`${this.baseUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(formattedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw {
          error: 'Failed to resend OTP',
          message: result.message || 'Failed to resend OTP',
          statusCode: response.status,
          details: result.details,
        } as AuthError;
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw {
          error: 'Failed to resend OTP',
          message: error.message,
          statusCode: 400,
        } as AuthError;
      }
      throw error;
    }
  }

  /**
   * Get user profile (requires authentication)
   */
  async getProfile(accessToken: string): Promise<{ success: boolean; data: UserProfile }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw {
          error: 'Failed to get profile',
          message: result.message || 'Failed to get profile',
          statusCode: response.status,
          details: result.details,
        } as AuthError;
      }

      // Transform API response to match our interface
      return {
        success: true,
        data: result
      };
    } catch (error) {
      if (error instanceof Error) {
        throw {
          error: 'Failed to get profile',
          message: error.message,
          statusCode: 400,
        } as AuthError;
      }
      throw error;
    }
  }

  /**
   * Sign out user (requires authentication)
   * Uses default notification settings (transaction notifications disabled, promotional notifications enabled)
   */
  async signOut(
    accessToken: string
  ): Promise<{ success: boolean; message: string; transactionNotificationsDisabled: boolean; promotionalNotificationsDisabled: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw {
          error: 'Failed to sign out',
          message: result.message || 'Failed to sign out',
          statusCode: response.status,
          details: result.details,
        } as AuthError;
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw {
          error: 'Failed to sign out',
          message: error.message,
          statusCode: 400,
        } as AuthError;
      }
      throw error;
    }
  }

  /**
   * Request account deletion OTP (requires authentication)
   */
  async requestAccountDeletion(
    accessToken: string,
    data: RequestAccountDeletionRequest
  ): Promise<RequestAccountDeletionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/request-account-deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw {
          error: 'Failed to request account deletion',
          message: result.message || 'Failed to request account deletion',
          statusCode: response.status,
          details: result.details,
        } as AuthError;
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw {
          error: 'Failed to request account deletion',
          message: error.message,
          statusCode: 400,
        } as AuthError;
      }
      throw error;
    }
  }

  /**
   * Confirm account deletion with OTP (requires authentication)
   */
  async confirmAccountDeletion(
    accessToken: string,
    data: ConfirmAccountDeletionRequest
  ): Promise<ConfirmAccountDeletionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/confirm-account-deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw {
          error: 'Failed to confirm account deletion',
          message: result.message || 'Failed to confirm account deletion',
          statusCode: response.status,
          details: result.details,
        } as AuthError;
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw {
          error: 'Failed to confirm account deletion',
          message: error.message,
          statusCode: 400,
        } as AuthError;
      }
      throw error;
    }
  }
}

export default AuthService; 