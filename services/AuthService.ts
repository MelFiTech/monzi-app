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
  phone: string; // +234XXXXXXXXXX format
  otpCode: string; // 6-digit SMS OTP
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
  phone: string; // +234XXXXXXXXXX format
}

export interface ResendOtpResponse {
  success: boolean;
  message: string;
  data?: {
    otpSent: boolean;
    nextResendAvailable: number; // Unix timestamp
  };
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
    // Replace with your actual API base URL
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://5a498535736b.ngrok-free.app';
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
   * Verify SMS OTP
   */
  async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    try {
      // Validate input data
      if (!this.validatePhoneNumber(data.phone)) {
        throw new Error('Invalid Nigerian phone number format');
      }

      if (!/^[0-9]{6}$/.test(data.otpCode)) {
        throw new Error('OTP must be exactly 6 digits');
      }

      const formattedData = {
        phone: this.formatPhoneNumber(data.phone),
        otpCode: data.otpCode,
      };

      const response = await fetch(`${this.baseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
   * Resend SMS OTP
   */
  async resendOtp(data: ResendOtpRequest): Promise<ResendOtpResponse> {
    try {
      // Validate input data
      if (!this.validatePhoneNumber(data.phone)) {
        throw new Error('Invalid Nigerian phone number format');
      }

      const formattedData = {
        phone: this.formatPhoneNumber(data.phone),
      };

      const response = await fetch(`${this.baseUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
}

export default AuthService; 