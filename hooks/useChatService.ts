import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ChatService, { type UserData } from '@/services/ChatService';

// Query Keys
export const chatQueryKeys = {
  all: ['chat'] as const,
  auth: () => [...chatQueryKeys.all, 'auth'] as const,
  authFlow: () => [...chatQueryKeys.auth(), 'flow'] as const,
  otpVerification: (otp: string) => [...chatQueryKeys.auth(), 'otp', otp] as const,
  userRegistration: () => [...chatQueryKeys.auth(), 'registration'] as const,
};

// Get Auth Flow Hook
export function useAuthFlow() {
  return useQuery({
    queryKey: chatQueryKeys.authFlow(),
    queryFn: () => ChatService.getAuthFlow(),
    staleTime: Infinity, // Auth flow doesn't change
    gcTime: Infinity, // Keep cached indefinitely
  });
}

// OTP Verification Hook
export function useOTPVerification(otp: string, enabled = false) {
  return useQuery({
    queryKey: chatQueryKeys.otpVerification(otp),
    queryFn: () => ChatService.simulateOTPVerification(otp),
    enabled: enabled && otp.length === 6,
    staleTime: 0, // Always fresh for security
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    retry: false, // Don't retry failed OTP attempts
  });
}

// OTP Verification Mutation Hook
export function useOTPVerificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (otp: string) => ChatService.simulateOTPVerification(otp),
    onSuccess: (data, otp) => {
      // Cache successful verification
      queryClient.setQueryData(chatQueryKeys.otpVerification(otp), data);
    },
    retry: false, // Don't retry OTP verification
  });
}

// User Registration Mutation Hook
export function useUserRegistrationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UserData) => ChatService.registerUser(userData),
    onSuccess: (data) => {
      // Invalidate auth queries on successful registration
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.auth() });
      
      // Cache user data if registration successful
      if (data.success && data.user) {
        queryClient.setQueryData(['user', 'profile'], data.user);
      }
    },
    retry: 1, // Retry once on failure
    retryDelay: 2000,
  });
}

// Typing Delay Hook (for realistic chat experience)
export function useTypingDelay() {
  return useMutation({
    mutationFn: () => ChatService.simulateTypingDelay(),
    retry: false,
  });
}

// Input Validation Hook
export function useInputValidation() {
  return {
    validateInput: (input: string, field: keyof UserData, userData: UserData) =>
      ChatService.validateInput(input, field, userData),
    formatPhoneNumber: (phone: string) => ChatService.formatPhoneNumber(phone),
    sanitizeInput: (input: string, inputType: any) => ChatService.sanitizeInput(input, inputType),
  };
}

// Chat utilities
export function useChatUtils() {
  const queryClient = useQueryClient();

  return {
    // Create message helper
    createMessage: (text: string, isBot: boolean, showInput?: boolean, inputType?: any, placeholder?: string) =>
      ChatService.createMessage(text, isBot, showInput, inputType, placeholder),
    
    // Get success message
    getSuccessMessage: () => ChatService.getSuccessMessage(),
    
    // Clear all auth cache
    clearAuthCache: () => {
      queryClient.removeQueries({ queryKey: chatQueryKeys.auth() });
    },
    
    // Check if user is registered
    isUserRegistered: () => {
      const userData = queryClient.getQueryData(['user', 'profile']);
      return Boolean(userData);
    },
  };
}

// Invalidate chat queries helper
export function useInvalidateChatQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: chatQueryKeys.all }),
    invalidateAuth: () => queryClient.invalidateQueries({ queryKey: chatQueryKeys.auth() }),
    invalidateOTPVerification: (otp: string) =>
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.otpVerification(otp) }),
  };
} 