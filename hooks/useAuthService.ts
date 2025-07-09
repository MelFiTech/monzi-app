import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { 
  AuthService, 
  AuthStorageService, 
  BiometricService,
  RegisterRequest, 
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ResendOtpRequest,
  ResendOtpResponse,
  UserProfile,
  AuthError
} from '@/services';

const authService = AuthService.getInstance();
const authStorageService = AuthStorageService.getInstance();
const biometricService = BiometricService.getInstance();

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
  authStatus: () => [...authKeys.all, 'authStatus'] as const,
  deviceInfo: () => [...authKeys.all, 'deviceInfo'] as const,
};

/**
 * Hook for user registration
 */
export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation<RegisterResponse, AuthError, RegisterRequest>({
    mutationFn: async (data: RegisterRequest) => {
      return await authService.register(data);
    },
    onSuccess: (response, variables) => {
      console.log('Registration successful:', response);
      // Invalidate auth status
      queryClient.invalidateQueries({ queryKey: authKeys.authStatus() });
    },
    onError: (error) => {
      console.log('Registration failed:', error);
    },
  });
};

/**
 * Hook for user login
 */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, AuthError, LoginRequest>({
    mutationFn: async (data: LoginRequest) => {
      return await authService.login(data);
    },
    onSuccess: async (response, variables) => {
      if (response.success && response.data) {
        // Store auth data
        await authStorageService.storeAuthData(response.data);
        
        // Enable biometric login if available
        const isBiometricAvailable = await biometricService.isBiometricAvailable();
        if (isBiometricAvailable) {
          await authStorageService.setBiometricEnabled(true);
        }

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: authKeys.all });
        queryClient.setQueryData(authKeys.profile(), response.data.user);
      }
    },
    onError: (error) => {
      console.log('Login failed:', error);
    },
  });
};

/**
 * Hook for OTP verification
 */
export const useVerifyOtp = () => {
  const queryClient = useQueryClient();

  return useMutation<VerifyOtpResponse, AuthError, { phone: string; otp: string }>({
    mutationFn: async (data: { phone: string; otp: string }) => {
      return await authService.verifyOtp({
        phone: data.phone,
        otpCode: data.otp,
      });
    },
    onSuccess: async (response, variables) => {
      if (response.success && response.data) {
        // Store auth data
        await authStorageService.storeAuthData(response.data);
        
        // Enable biometric login if available
        const isBiometricAvailable = await biometricService.isBiometricAvailable();
        if (isBiometricAvailable) {
          await authStorageService.setBiometricEnabled(true);
        }

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: authKeys.all });
        queryClient.setQueryData(authKeys.profile(), response.data.user);
      }
    },
    onError: (error) => {
      console.log('OTP verification failed:', error);
    },
  });
};

/**
 * Hook for resending OTP
 */
export const useResendOtp = () => {
  return useMutation<ResendOtpResponse, AuthError, ResendOtpRequest>({
    mutationFn: async (data: ResendOtpRequest) => {
      return await authService.resendOtp(data);
    },
    onSuccess: (response) => {
      console.log('OTP resend successful:', response);
    },
    onError: (error) => {
      console.log('OTP resend failed:', error);
    },
  });
};

/**
 * Hook for getting user profile
 */
export const useProfile = () => {
  return useQuery<UserProfile | null, Error>({
    queryKey: authKeys.profile(),
    queryFn: async () => {
      const accessToken = await authStorageService.getAccessToken();
      if (!accessToken) return null;

      try {
        const response = await authService.getProfile(accessToken);
        return response.data;
      } catch (error) {
        console.log('Failed to fetch profile:', error);
        return null;
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if unauthorized
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for getting authentication status
 */
export const useAuthStatus = () => {
  return useQuery({
    queryKey: authKeys.authStatus(),
    queryFn: async () => {
      return await authStorageService.getAuthStatus();
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

/**
 * Hook for getting device information
 */
export const useDeviceInfo = () => {
  return useQuery({
    queryKey: authKeys.deviceInfo(),
    queryFn: async () => {
      return await authStorageService.getDeviceInfo();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for logout functionality
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { clearAllData?: boolean }>({
    mutationFn: async ({ clearAllData = false }) => {
      if (clearAllData) {
        await authStorageService.clearAllData();
      } else {
        await authStorageService.clearAuthData();
      }
    },
    onSuccess: () => {
      // Clear all auth-related queries
      queryClient.removeQueries({ queryKey: authKeys.all });
      queryClient.clear();
      console.log('Logout successful');
    },
    onError: (error) => {
      console.log('Logout failed:', error);
    },
  });
};

/**
 * Hook for biometric authentication
 */
export const useBiometricAuth = () => {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { reason?: string }>({
    mutationFn: async ({ reason }) => {
      const result = await biometricService.authenticate(reason);
      return result.success;
    },
    onSuccess: (success) => {
      if (success) {
        // Invalidate auth status to trigger re-fetch
        queryClient.invalidateQueries({ queryKey: authKeys.authStatus() });
      }
    },
    onError: (error) => {
      console.log('Biometric authentication failed:', error);
    },
  });
};

/**
 * Hook for managing biometric settings
 */
export const useBiometricSettings = () => {
  const queryClient = useQueryClient();

  const setBiometricEnabled = useMutation<void, Error, boolean>({
    mutationFn: async (enabled: boolean) => {
      await authStorageService.setBiometricEnabled(enabled);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.authStatus() });
    },
  });

  const checkBiometricAvailability = useCallback(async () => {
    return await biometricService.isBiometricAvailable();
  }, []);

  const getBiometricType = useCallback(async () => {
    return await biometricService.getBiometricType();
  }, []);

  return {
    setBiometricEnabled,
    checkBiometricAvailability,
    getBiometricType,
  };
};

/**
 * Combined auth hook with common operations
 */
export const useAuth = () => {
  const authStatus = useAuthStatus();
  const profile = useProfile();
  const login = useLogin();
  const register = useRegister();
  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();
  const logout = useLogout();
  const biometricAuth = useBiometricAuth();
  const biometricSettings = useBiometricSettings();

  const isLoading = authStatus.isLoading || profile.isLoading;
  const isAuthenticated = authStatus.data?.isAuthenticated || false;
  const user = profile.data;

  return {
    // Data
    isLoading,
    isAuthenticated,
    user,
    authStatus: authStatus.data,
    
    // Mutations
    login,
    register,
    verifyOtp,
    resendOtp,
    logout,
    biometricAuth,
    biometricSettings,
    
    // Utilities
    refetchAuthStatus: authStatus.refetch,
    refetchProfile: profile.refetch,
  };
};

export default useAuth; 