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

export default function ResetPinScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const newPinRef = useRef<TextInput>(null);
  const { otpCode, email } = useLocalSearchParams<{ otpCode: string; email: string }>();

  useEffect(() => {
    const timer = setTimeout(() => {
      newPinRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const resetPinMutation = useMutation({
    mutationFn: async ({ otpCode, newPin, email }: { otpCode: string; newPin: string; email: string }) => {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/reset-transaction-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          email,
          otpCode,
          newPin,
        }),
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        return { success: true, message: 'PIN reset successfully' };
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset PIN');
      }

      return result;
    },
    onSuccess: () => {
      showToast('Your transaction PIN has been successfully reset', 'success');
      setTimeout(() => {
        router.dismissAll();
        router.replace('/profile');
      }, 1500);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to reset PIN', 'error');
    },
  });

  const updateField = (field: string, value: string) => {
    // Only allow digits and max 4 characters for PIN
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 4);
    
    if (field === 'newPin') {
      setNewPin(digitsOnly);
    } else if (field === 'confirmPin') {
      setConfirmPin(digitsOnly);
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newPin) {
      newErrors.newPin = 'New PIN is required';
    } else if (newPin.length !== 4) {
      newErrors.newPin = 'PIN must be 4 digits';
    }
    
    if (!confirmPin) {
      newErrors.confirmPin = 'Please confirm your new PIN';
    } else if (confirmPin !== newPin) {
      newErrors.confirmPin = 'PINs do not match';
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

    resetPinMutation.mutate({
      otpCode: otpCode as string,
      newPin,
      email: email as string,
    });
  };

  const isFormValid = () => {
    return newPin.length === 4 && 
           confirmPin.length === 4 &&
           newPin === confirmPin;
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
            <Text style={styles.title}>Reset PIN</Text>
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
                ref={newPinRef}
                label="New PIN"
                value={newPin}
                onChangeText={(text) => updateField('newPin', text)}
                placeholder="Enter new PIN"
                inputType="password"
                keyboardType="numeric"
                maxLength={4}
                error={errors.newPin}
                secureTextEntry={true}
              />

              <RegisterAuthInput
                label="Confirm New PIN"
                value={confirmPin}
                onChangeText={(text) => updateField('confirmPin', text)}
                placeholder="Confirm new PIN"
                inputType="password"
                keyboardType="numeric"
                maxLength={4}
                error={errors.confirmPin}
                secureTextEntry={true}
              />
            </View>
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.footer}>
            <Button
              title={resetPinMutation.isPending ? 'Resetting PIN...' : 'Reset PIN'}
              variant={isFormValid() ? "primary" : "secondary"}
              size="lg"
              fullWidth
              onPress={handleSubmit}
              disabled={!isFormValid() || resetPinMutation.isPending}
              loading={resetPinMutation.isPending}
            />
          </View>
        </KeyboardAvoidingView>

        {/* Activity Indicator Overlay */}
        {resetPinMutation.isPending && (
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1,
  },
}); 