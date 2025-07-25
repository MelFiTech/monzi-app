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
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { AuthHeader } from '@/components/auth';
import RegisterAuthInput from '@/components/auth/Register-AuthInput';
import { AuthStorageService } from '@/services';
import { getApiBaseUrl } from '@/constants/config';

export default function ForgotPasscodeScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const fromLogin = params.fromLogin === 'true';
  
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  
  const otpInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const authStorageService = AuthStorageService.getInstance();

  // Auto-focus appropriate input after screen loads
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromLogin) {
        emailInputRef.current?.focus();
      } else {
        otpInputRef.current?.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [fromLogin]);

  // Get user email on mount and handle OTP request
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        const userProfile = await authStorageService.getUserProfile();
        if (userProfile?.email) {
          setUserEmail(userProfile.email);
          // Only auto-request OTP if not coming from login
          if (!fromLogin) {
            requestResetOtpMutation.mutate();
          }
        } else if (!fromLogin) {
          showToast('User email not found. Please login again.', 'error');
          router.back();
        }
      } catch (error) {
        if (!fromLogin) {
          showToast('Failed to get user information', 'error');
          router.back();
        }
      }
    };

    initializeScreen();
  }, [fromLogin]);

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
      const emailToUse = fromLogin ? emailInput : userEmail;
      if (!emailToUse) {
        throw new Error('Email is required');
      }

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/request-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          email: emailToUse
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
      // Navigate to reset passcode screen with OTP code and email
      const emailToUse = fromLogin ? emailInput : userEmail;
      router.push({
        pathname: '/reset-passcode',
        params: { otpCode: otp, email: emailToUse }
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
          {fromLogin && countdown === 0 ? 'Reset your passcode' : 'Enter code sent to your email'}
        </Text>
      </View>

      {/* Main Content */}
      <View style={containerStyles.content}>
        {/* Email Input - Only show when coming from login and OTP hasn't been sent yet */}
        {fromLogin && countdown === 0 && (
          <View style={containerStyles.emailContainer}>
            <RegisterAuthInput
              ref={emailInputRef}
              label="Email"
              value={emailInput}
              onChangeText={(text) => setEmailInput(text.trim())}
              placeholder="Enter your email address"
              inputType="email"
              style={containerStyles.emailInput}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => {
                if (emailInput.trim()) {
                  requestResetOtpMutation.mutate();
                }
              }}
            />
            
            {/* Send Code Button */}
            <TouchableOpacity
              onPress={() => requestResetOtpMutation.mutate()}
              style={[
                buttonStyles.sendCodeButton,
                (!emailInput.trim() || requestResetOtpMutation.isPending) && buttonStyles.sendCodeButtonDisabled
              ]}
              disabled={!emailInput.trim() || requestResetOtpMutation.isPending}
            >
              <Text style={[
                textStyles.sendCodeText,
                (!emailInput.trim() || requestResetOtpMutation.isPending) && textStyles.sendCodeTextDisabled
              ]}>
                {requestResetOtpMutation.isPending ? 'Sending...' : 'Send Code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OTP Input - Show when not coming from login, or when coming from login and OTP has been sent */}
        {(!fromLogin || (fromLogin && countdown > 0)) && (
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
                autoFocus={!fromLogin || (fromLogin && countdown > 0)}
                returnKeyType="done"
                onSubmitEditing={() => handleVerify()}
                textAlign="left"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
              />
            </View>
            
            {verifyOtpMutation.isPending && (
              <View style={containerStyles.loaderContainer}>
                <ActivityIndicator 
                  color="#FFE66C"
                  size="small"
                />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Footer - Only show when OTP input is visible */}
      {(!fromLogin || (fromLogin && countdown > 0)) && (
        <View style={[
          containerStyles.footer,
          keyboardHeight > 0 && {
            position: 'absolute',
            bottom: keyboardHeight + -20,
            left: 0,
            right: 0,
          }
        ]}>
          {countdown > 0 ? (
            <Text style={textStyles.countdownText}>
              Resend code in 00:{countdown.toString().padStart(2, '0')}
            </Text>
          ) : (
            <TouchableOpacity 
              onPress={handleResendOtp} 
              style={buttonStyles.resendButton}
              disabled={requestResetOtpMutation.isPending}
            >
              <Text style={textStyles.resendText}>
                {requestResetOtpMutation.isPending ? 'Sending...' : 'Resend'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  emailContainer: {
    marginBottom: 20,
  },
  emailInput: {
    marginBottom: 16,
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
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
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
  sendCodeText: {
    fontFamily: fontFamilies.sora.medium,
    fontSize: fontSizes.base,
    color: '#000',
    textAlign: 'center',
  },
  sendCodeTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

const buttonStyles = StyleSheet.create({
  resendButton: {
    paddingVertical: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  sendCodeButton: {
    backgroundColor: '#FFE66C',
    borderRadius: 65,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sendCodeButtonDisabled: {
    backgroundColor: 'rgb(32, 32, 32)',
  },
}); 