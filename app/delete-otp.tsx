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
import { useAuth } from '@/hooks/useAuthService';
import { AuthHeader } from '@/components/auth';

export default function DeleteOTPScreen() {
  const { reason } = useLocalSearchParams<{ reason: string }>();
  const { confirmAccountDeletion } = useAuth();
  
  const [otp, setOtp] = useState('');
  const [hasNavigated, setHasNavigated] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      otpInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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
    if (digitsOnly.length === 6 && !confirmAccountDeletion.isPending && !hasNavigated) {
      handleVerify(digitsOnly);
    }
  }

  async function handleVerify(otpValue?: string) {
    const otpToVerify = otpValue || otp;
    if (otpToVerify.length !== 6 || confirmAccountDeletion.isPending || hasNavigated) return;

    setHasNavigated(true);
    
    try {
      const result = await confirmAccountDeletion.mutateAsync({
        otpCode: otpToVerify,
        reason: reason,
      });

      if (result.success) {
        // Navigate to success screen
        router.replace('/delete-success');
      } else {
        setHasNavigated(false); // Allow retry
        Alert.alert('Verification Failed', result.message || 'Invalid OTP code');
      }
    } catch (error: any) {
      setHasNavigated(false); // Allow retry
      console.error('Delete OTP verification error:', error);
      Alert.alert('Error', error.message || 'Verification failed. Please try again.');
    }
  }

  function handleClose() {
    if (confirmAccountDeletion.isPending || hasNavigated) return;
    router.back();
  }

  return (
    <SafeAreaView style={containerStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <AuthHeader variant="back" />

      {/* Main Content */}
      <View style={containerStyles.content}>
        <Text style={textStyles.title}>
          Enter code sent{'\n'}to your email
        </Text>

        <Text style={textStyles.subtitle}>
          We've sent a verification code to confirm your account deletion request
        </Text>

        <View style={containerStyles.inputContainer}>
          <View style={containerStyles.otpInputWrapper}>
            <TextInput
              ref={otpInputRef}
              style={[
                containerStyles.otpInput,
                confirmAccountDeletion.isPending && containerStyles.otpInputDisabled
              ]}
              placeholder="••••••"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="numeric"
              maxLength={6}
              editable={!confirmAccountDeletion.isPending}
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={() => handleVerify()}
              textAlign="center"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />
          </View>
          
          {confirmAccountDeletion.isPending && (
            <ActivityIndicator 
              style={containerStyles.loader}
              color="#FFE66C"
              size="small"
            />
          )}
        </View>

        <View style={containerStyles.warningContainer}>
          <Text style={textStyles.warningText}>
            ⚠️ This action cannot be undone. Your account will be permanently deleted.
          </Text>
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
        <Text style={textStyles.helpText}>
          Didn't receive the code? Check your email spam folder
        </Text>
      </View>
    </SafeAreaView>
  );
}

const containerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  warningContainer: {
    marginTop: 40,
    padding: 16,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
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
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'left',
    marginTop: 12,
    lineHeight: 24,
  },
  warningText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFC107',
    textAlign: 'left',
    lineHeight: 20,
  },
  helpText: {
    fontFamily: fontFamilies.sora.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'left',
  },
}); 