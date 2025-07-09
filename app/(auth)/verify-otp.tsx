import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { useVerifyOtp, useResendOtp } from '@/hooks';

export default function VerifyOTPScreen() {
  const { email, phone } = useLocalSearchParams<{ email: string; phone: string }>();
  const verifyOtpMutation = useVerifyOtp();
  const resendOtpMutation = useResendOtp();
  
  const [otp, setOtp] = useState('');
  const [hasNavigated, setHasNavigated] = useState(false);
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      otpInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  function handleOtpChange(value: string) {
    // Only allow digits
    const digitsOnly = value.replace(/[^0-9]/g, '');
    
    // Limit to 6 digits
    const truncatedValue = digitsOnly.slice(0, 6);
    
    setOtp(truncatedValue);
    
    // Auto verify when 6th digit is entered - but only once
    if (truncatedValue.length === 6 && !verifyOtpMutation.isPending && !hasNavigated) {
      handleVerify(truncatedValue);
    }
  }

  async function handleVerify(otpValue?: string) {
    const otpToVerify = otpValue || otp;
    if (otpToVerify.length !== 6 || verifyOtpMutation.isPending || hasNavigated || !phone) return;

    setHasNavigated(true);
    
    try {
      const result = await verifyOtpMutation.mutateAsync({
        phone: phone,
        otp: otpToVerify,
      });

      if (result.success) {
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

  function handleChangeEmail() {
    if (verifyOtpMutation.isPending || hasNavigated) return;
    router.back();
  }

  function handleClose() {
    if (verifyOtpMutation.isPending || hasNavigated) return;
    router.back();
  }

  async function handleResendOtp() {
    if (resendOtpMutation.isPending || !phone) return;
    
    try {
      const result = await resendOtpMutation.mutateAsync({
        phone: phone,
      });

      if (result.success) {
        Alert.alert('OTP Sent', 'A new verification code has been sent to your phone');
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
      
      <KeyboardAvoidingView
        style={containerStyles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        <View style={containerStyles.content}>
          {/* Header */}
          <View style={containerStyles.header}>
            <TouchableOpacity onPress={handleClose} style={containerStyles.closeButton}>
              <Image 
                source={require('@/assets/icons/auth/arrow-left.png')}
                style={{width: 24, height: 24, tintColor: '#FFFFFF'}}
              />
            </TouchableOpacity>
          </View>

          <View style={containerStyles.main}>
            <Text style={textStyles.title}>
              Enter Code
            </Text>
            <Text style={textStyles.subtitle}>
              Sent to {phone || email || 'your phone'}
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

          <View style={containerStyles.footer}>
            <TouchableOpacity 
              onPress={handleChangeEmail} 
              style={buttonStyles.changeEmail}
              disabled={verifyOtpMutation.isPending}
            >
              <Text style={textStyles.changeEmailText}>
                Wrong phone? <Text style={textStyles.link}>change</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleResendOtp} 
              style={[buttonStyles.changeEmail, { marginTop: 16 }]}
              disabled={resendOtpMutation.isPending}
            >
              <Text style={textStyles.changeEmailText}>
                Didn't get code? <Text style={textStyles.link}>
                  {resendOtpMutation.isPending ? 'Sending...' : 'resend'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const containerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    paddingLeft: -20,
    marginLeft: -10,
    marginBottom: -20,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  main: {
    flex: 1,
    paddingTop: 40,
  },
  inputContainer: {
    position: 'relative',
    marginTop: 40,
  },
  otpInputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
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
    alignSelf: 'center',
  },
  footer: {
    paddingBottom: 34,
  },
});

const textStyles = StyleSheet.create({
  title: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamilies.clashDisplay.bold,
    lineHeight: fontSizes['2xl'] * 1.2,
    marginBottom: 8,
    color: '#FFFFFF',   
  },
  subtitle: {
    fontFamily: fontFamilies.sora.regular,
    fontSize: fontSizes.base,
    marginBottom: 20,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  changeEmailText: {
    fontFamily: fontFamilies.sora.regular,
    fontSize: fontSizes.base,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  link: {
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFE66C',
  },
});

const buttonStyles = StyleSheet.create({
  changeEmail: {
    marginBottom: -16,
  },
}); 