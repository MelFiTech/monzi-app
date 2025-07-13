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
  Image,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { useVerifyOtp, useResendOtp } from '@/hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VerifyOTPScreen() {
  const { email, phone } = useLocalSearchParams<{ email: string; phone: string }>();
  const verifyOtpMutation = useVerifyOtp();
  const resendOtpMutation = useResendOtp();
  
  const [otp, setOtp] = useState('');
  const [hasNavigated, setHasNavigated] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      otpInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
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

  function handleOtpChange(value: string) {
    // Only allow digits and limit to 6
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(digitsOnly);
    
    // Auto verify when 6 digits are entered
    if (digitsOnly.length === 6 && !verifyOtpMutation.isPending && !hasNavigated) {
      handleVerify(digitsOnly);
    }
  }

  async function handleVerify(otpValue?: string) {
    const otpToVerify = otpValue || otp;
    if (otpToVerify.length !== 6 || verifyOtpMutation.isPending || hasNavigated || !email) return;

    setHasNavigated(true);
    
    try {
      const result = await verifyOtpMutation.mutateAsync({
        phone: email, // Use email as phone parameter since backend expects phone field
        otp: otpToVerify,
      });

      if (result.success) {
        // Set flag to indicate fresh registration completion
        await AsyncStorage.setItem('fresh_registration', 'true');
        
        // Navigate to main app
        router.push('/(tabs)');
      } else {
        setHasNavigated(false); // Allow retry
        Alert.alert('Verification Failed', result.message || 'Invalid OTP code');
      }
    } catch (error: any) {
      setHasNavigated(false); // Allow retry
      console.error('OTP verification error:', error);
      Alert.alert('Error', error.message || 'Verification failed. Please try again.');
    }
  }

  function handleClose() {
    if (verifyOtpMutation.isPending || hasNavigated) return;
    router.back();
  }

  async function handleResendOtp() {
    if (resendOtpMutation.isPending || !email) return;
    
    try {
      const result = await resendOtpMutation.mutateAsync({
        phone: email, // Use email as phone parameter since backend expects phone field
      });

      if (result.success) {
        setCountdown(60); // Reset countdown
        Alert.alert('OTP Sent', 'A new verification code has been sent to your email');
      } else {
        Alert.alert('Resend Failed', result.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', error.message || 'Failed to resend OTP. Please try again.');
    }
  }

  return (
    <SafeAreaView style={containerStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={containerStyles.header}>
        <TouchableOpacity onPress={handleClose} style={containerStyles.closeButton}>
          <Image 
            source={require('@/assets/icons/auth/arrow-left.png')}
            style={{width: 24, height: 24, tintColor: '#FFFFFF'}}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={containerStyles.content}>
        <Text style={textStyles.title}>
          Enter code sent{'\n'}to your email
        </Text>

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
              textAlign="center"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />
          </View>
          
          {verifyOtpMutation.isPending && (
            <ActivityIndicator 
              style={containerStyles.loader}
              color="#FFE66C"
              size="small"
            />
          )}
        </View>
      </View>

      {/* Footer */}
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
            disabled={resendOtpMutation.isPending}
          >
            <Text style={textStyles.resendText}>
              {resendOtpMutation.isPending ? 'Sending...' : 'Resend'}
            </Text>
          </TouchableOpacity>
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
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginLeft: -8,
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
    textAlign: 'center',
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
  loader: {
    marginTop: 24,
    alignSelf: 'flex-start',
  },
  footer: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
});

const textStyles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontFamily: fontFamilies.clashDisplay.bold,
    lineHeight: 32 * 1.2,
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
    fontFamily: fontFamilies.sora.semiBold,
    fontSize: 16,
    color: '#FFE66C',
    textAlign: 'left',
  },
});

const buttonStyles = StyleSheet.create({
  resendButton: {
    paddingVertical: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
}); 