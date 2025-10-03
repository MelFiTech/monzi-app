import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { RegisterAuthInput } from '@/components/auth';
import { AuthHeader } from '@/components/auth';
import { Button } from '@/components/common';
import { AuthStorageService } from '@/services';
import { getApiBaseUrl } from '@/constants/config';

export default function ChangePinScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const currentPinRef = useRef<TextInput>(null);
  const authStorageService = AuthStorageService.getInstance();

  useEffect(() => {
    const timer = setTimeout(() => {
      currentPinRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const changeTransactionPinMutation = useMutation({
    mutationFn: async ({ currentPin, newPin }: { currentPin: string; newPin: string }) => {
      const accessToken = await authStorageService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token found');
      }

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/change-transaction-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          currentPin,
          newPin,
        }),
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        // If it's a successful response but not JSON, assume success
        return { success: true, message: 'PIN changed successfully' };
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to change PIN');
      }

      return result;
    },
    onSuccess: () => {
      showToast('Your transaction PIN has been changed successfully', 'success');
      setTimeout(() => {
        router.back();
      }, 1500);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to change PIN', 'error');
    },
  });

  const handleForgotPin = () => {
    router.push('/forgot-pin');
  };

  const updateField = (field: string, value: string) => {
    // Only allow digits and max 4 characters for PIN
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 4);
    
    if (field === 'currentPin') {
      setCurrentPin(digitsOnly);
    } else if (field === 'newPin') {
      setNewPin(digitsOnly);
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!currentPin) {
      newErrors.currentPin = 'Current PIN is required';
    } else if (currentPin.length !== 4) {
      newErrors.currentPin = 'PIN must be 4 digits';
    }
    
    if (!newPin) {
      newErrors.newPin = 'New PIN is required';
    } else if (newPin.length !== 4) {
      newErrors.newPin = 'PIN must be 4 digits';
    }
    
    if (currentPin === newPin && currentPin.length === 4) {
      newErrors.newPin = 'New PIN must be different from current PIN';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    changeTransactionPinMutation.mutate({
      currentPin,
      newPin,
    });
  };

  const isFormValid = () => {
    return currentPin.length === 4 && 
           newPin.length === 4 &&
           currentPin !== newPin;
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
            <Text style={styles.title}>Change PIN</Text>
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
                ref={currentPinRef}
                label="Current PIN"
                value={currentPin}
                onChangeText={(text) => updateField('currentPin', text)}
                placeholder="Enter current PIN"
                inputType="password"
                keyboardType="numeric"
                maxLength={4}
                error={errors.currentPin}
                secureTextEntry={true}
              />

              <RegisterAuthInput
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
            </View>

            {/* Forgot PIN Link */}
            <TouchableOpacity onPress={handleForgotPin} style={styles.forgotLink}>
              <Text style={[styles.forgotText, { color: '#FFE66C' }]}>Forgot PIN?</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.footer}>
            <Button
              title={changeTransactionPinMutation.isPending ? 'Changing PIN...' : 'Change PIN'}
              variant={isFormValid() ? "primary" : "secondary"}
              size="lg"
              fullWidth
              onPress={handleSubmit}
              disabled={!isFormValid() || changeTransactionPinMutation.isPending}
              loading={changeTransactionPinMutation.isPending}
            />
          </View>
        </KeyboardAvoidingView>

        {/* Activity Indicator Overlay */}
        {changeTransactionPinMutation.isPending && (
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
    marginTop: -20,
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
  forgotLink: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  forgotText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.clashDisplay.medium,
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