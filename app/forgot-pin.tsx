import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Keyboard,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/providers/ToastProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { AuthHeader } from '@/components/auth';
import { AuthStorageService } from '@/services';
import { getApiBaseUrl } from '@/constants/config';
import { useTheme } from '@react-navigation/native';

export default function ForgotPINScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const otpInputRef = useRef<TextInput>(null);
  const authStorageService = AuthStorageService.getInstance();

  // Auto-focus OTP input after screen loads
  useEffect(() => {
    const timer = setTimeout(() => {
      otpInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Get user email on mount and automatically request OTP
  useEffect(() => {
    const initializeAndRequestOTP = async () => {
      try {
        const userProfile = await authStorageService.getUserProfile();
        if (userProfile?.email) {
          setUserEmail(userProfile.email);
          // Automatically request OTP when screen opens
          requestResetOtpMutation.mutate();
        } else {
          showToast('User email not found. Please login again.', 'error');
          router.back();
        }
      } catch (error) {
        showToast('Failed to get user information', 'error');
        router.back();
      }
    };

    initializeAndRequestOTP();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const requestResetOtpMutation = useMutation({
    mutationFn: async () => {
      if (!userEmail) {
        throw new Error('User email not found');
      }

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/request-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          email: userEmail
        }),
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        return { success: true, message: 'OTP sent successfully' };
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send OTP');
      }

      return result;
    },
    onSuccess: () => {
      setCountdown(60);
      showToast('A verification code has been sent to your email', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to send OTP. Please try again.', 'error');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (otpCode: string) => {
      // For the new flow, we don't need to verify OTP separately
      // We'll directly navigate to reset screen with the OTP
      return { success: true };
    },
    onSuccess: () => {
      // Navigate to reset PIN screen with OTP code and email
      router.push({
        pathname: '/reset-pin',
        params: { otpCode: otp, email: userEmail }
      });
    },
    onError: (error: Error) => {
      showToast(error.message || 'Invalid OTP code. Please try again.', 'error');
    },
  });

  function handleOtpChange(value: string) {
    // Only allow digits and limit to 6
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(digitsOnly);
    
    // Auto verify when 6 digits are entered
    if (digitsOnly.length === 6 && !verifyOtpMutation.isPending) {
      handleVerify(digitsOnly);
    }
  }

  function handleVerify(otpValue?: string) {
    const otpToVerify = otpValue || otp;
    if (otpToVerify.length !== 6 || verifyOtpMutation.isPending) return;

    verifyOtpMutation.mutate(otpToVerify);
  }

  function handleResendOtp() {
    if (requestResetOtpMutation.isPending) return;
    requestResetOtpMutation.mutate();
  }

  return (
    <SafeAreaView style={containerStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <AuthHeader variant="back" />

      {/* Title */}
      <View style={containerStyles.titleContainer}>
        <Text style={textStyles.title}>
          Forgot PIN
        </Text>
      </View>

      {/* Main Content */}
      <View style={containerStyles.content}>
        <View style={containerStyles.inputContainer}>
          <View style={containerStyles.otpInputWrapper}>
            <TextInput
              ref={otpInputRef}
              style={[
                containerStyles.otpInput,
                verifyOtpMutation.isPending && containerStyles.otpInputDisabled
              ]}
              placeholder="••••••"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="numeric"
              maxLength={6}
              editable={!verifyOtpMutation.isPending}
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={() => handleVerify()}
            />
          </View>

          {/* Resend OTP Section */}
          <View style={containerStyles.resendContainer}>
            <Text style={textStyles.description}>
              Didn't receive the code?
            </Text>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={countdown > 0 || requestResetOtpMutation.isPending}
              style={[
                containerStyles.resendButton,
                (countdown > 0 || requestResetOtpMutation.isPending) && containerStyles.resendButtonDisabled
              ]}
            >
              <Text style={[
                textStyles.resendText,
                (countdown > 0 || requestResetOtpMutation.isPending) && textStyles.resendTextDisabled
              ]}>
                {countdown > 0 
                  ? `Resend in ${countdown}s` 
                  : requestResetOtpMutation.isPending 
                    ? 'Sending...' 
                    : 'Resend Code'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading Indicator */}
        {(verifyOtpMutation.isPending || requestResetOtpMutation.isPending) && (
          <View style={containerStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFE66C" />
            <Text style={textStyles.loadingText}>
              {verifyOtpMutation.isPending ? 'Verifying...' : 'Sending OTP...'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const containerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  titleContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  inputContainer: {
    marginTop: 20,
    alignItems: 'flex-start',
  },
  otpInputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 35,
    width: '100%',
    maxWidth: 350,
  },
  otpInput: {
    fontSize: 24,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 24,
    textAlign: 'left',
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendButton: {
    paddingVertical: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
});

const textStyles = StyleSheet.create({
  title: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamilies.clashDisplay.semibold,
    lineHeight: fontSizes['2xl'] * 1.2,
    color: '#FFFFFF',
    textAlign: 'left',
  },
  countdownText: {
    fontFamily: fontFamilies.sora.regular,
    fontSize: fontSizes.base,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'left',
  },
  resendText: {
    fontFamily: fontFamilies.sora.medium,
    fontSize: fontSizes.base,
    color: '#FFE66C',
    textAlign: 'left',
  },
  resendTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  description: {
    fontFamily: fontFamilies.sora.regular,
    fontSize: fontSizes.base,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'left',
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: fontFamilies.sora.regular,
    fontSize: fontSizes.base,
    color: 'rgba(255, 255, 255, 0.6)',
  },
}); 