import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { RegisterAuthInput } from '@/components/auth';
import { AuthHeader } from '@/components/auth';
import { Button } from '@/components/common';
import { getApiBaseUrl } from '@/constants/config';

export default function ResetPasscodeScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const newPasscodeRef = useRef<TextInput>(null);
  const { otpCode, email } = useLocalSearchParams<{ otpCode: string; email: string }>();

  useEffect(() => {
    const timer = setTimeout(() => {
      newPasscodeRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const resetPasscodeMutation = useMutation({
    mutationFn: async ({ otpCode, newPasscode, email }: { otpCode: string; newPasscode: string; email: string }) => {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/reset-passcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          email,
          otpCode,
          newPasscode,
        }),
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        return { success: true, message: 'Passcode reset successfully' };
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset passcode');
      }

      return result;
    },
    onSuccess: () => {
      showToast('Your login passcode has been successfully reset', 'success');
      setTimeout(() => {
        router.dismissAll();
        router.replace('/profile');
      }, 1500);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to reset passcode', 'error');
    },
  });

  const updateField = (field: string, value: string) => {
    // Only allow digits and max 6 characters for passcode
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 6);
    
    if (field === 'newPasscode') {
      setNewPasscode(digitsOnly);
    } else if (field === 'confirmPasscode') {
      setConfirmPasscode(digitsOnly);
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newPasscode) {
      newErrors.newPasscode = 'New passcode is required';
    } else if (newPasscode.length !== 6) {
      newErrors.newPasscode = 'Passcode must be 6 digits';
    }
    
    if (!confirmPasscode) {
      newErrors.confirmPasscode = 'Please confirm your new passcode';
    } else if (confirmPasscode !== newPasscode) {
      newErrors.confirmPasscode = 'Passcodes do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    if (!otpCode || !email) {
      showToast('Missing required information. Please try again.', 'error');
      return;
    }

    resetPasscodeMutation.mutate({
      otpCode: otpCode as string,
      newPasscode,
      email: email as string,
    });
  };

  const isFormValid = () => {
    return newPasscode.length === 6 && 
           confirmPasscode.length === 6 &&
           newPasscode === confirmPasscode;
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <AuthHeader variant="back" />
          
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Reset Passcode</Text>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              <RegisterAuthInput
                ref={newPasscodeRef}
                label="New Passcode"
                value={newPasscode}
                onChangeText={(text) => updateField('newPasscode', text)}
                placeholder="Enter new passcode"
                inputType="password"
                keyboardType="numeric"
                maxLength={6}
                error={errors.newPasscode}
                secureTextEntry={true}
              />

              <RegisterAuthInput
                label="Confirm New Passcode"
                value={confirmPasscode}
                onChangeText={(text) => updateField('confirmPasscode', text)}
                placeholder="Confirm new passcode"
                inputType="password"
                keyboardType="numeric"
                maxLength={6}
                error={errors.confirmPasscode}
                secureTextEntry={true}
              />
            </View>
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.footer}>
            <Button
              title={resetPasscodeMutation.isPending ? 'Resetting Passcode...' : 'Reset Passcode'}
              variant={isFormValid() ? "primary" : "secondary"}
              size="lg"
              fullWidth
              onPress={handleSubmit}
              disabled={!isFormValid() || resetPasscodeMutation.isPending}
              loading={resetPasscodeMutation.isPending}
            />
          </View>
        </KeyboardAvoidingView>

        {/* Activity Indicator Overlay */}
        {resetPasscodeMutation.isPending && (
          <View style={styles.activityIndicatorOverlay}>
            <ActivityIndicator size="large" color="#FFE66C" />
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'left',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  form: {
    gap: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 20,
    backgroundColor: '#000000',
  },
  activityIndicatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 