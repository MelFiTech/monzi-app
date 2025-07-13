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

export default function ChangePasscodeScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const currentPasscodeRef = useRef<TextInput>(null);
  const authStorageService = AuthStorageService.getInstance();

  useEffect(() => {
    const timer = setTimeout(() => {
      currentPasscodeRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const changePasscodeMutation = useMutation({
    mutationFn: async ({ currentPasscode, newPasscode }: { currentPasscode: string; newPasscode: string }) => {
      const accessToken = await authStorageService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token found');
      }

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/change-passcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          currentPasscode,
          newPasscode,
        }),
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        // If it's a successful response but not JSON, assume success
        return { success: true, message: 'Passcode changed successfully' };
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to change passcode');
      }

      return result;
    },
    onSuccess: () => {
      showToast('Your login passcode has been changed successfully', 'success');
      setTimeout(() => {
        router.back();
      }, 1500);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to change passcode', 'error');
    },
  });

  const handleForgotPasscode = () => {
    router.push('/forgot-passcode');
  };

  const updateField = (field: string, value: string) => {
    // Only allow digits and max 6 characters for passcode
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 6);
    
    if (field === 'currentPasscode') {
      setCurrentPasscode(digitsOnly);
    } else if (field === 'newPasscode') {
      setNewPasscode(digitsOnly);
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!currentPasscode) {
      newErrors.currentPasscode = 'Current passcode is required';
    } else if (currentPasscode.length !== 6) {
      newErrors.currentPasscode = 'Passcode must be 6 digits';
    }
    
    if (!newPasscode) {
      newErrors.newPasscode = 'New passcode is required';
    } else if (newPasscode.length !== 6) {
      newErrors.newPasscode = 'Passcode must be 6 digits';
    }
    
    if (currentPasscode === newPasscode && currentPasscode.length === 6) {
      newErrors.newPasscode = 'New passcode must be different from current passcode';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    changePasscodeMutation.mutate({
      currentPasscode,
      newPasscode,
    });
  };

  const isFormValid = () => {
    return currentPasscode.length === 6 && 
           newPasscode.length === 6 &&
           currentPasscode !== newPasscode;
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
            <Text style={styles.title}>Change Passcode</Text>
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
                ref={currentPasscodeRef}
                label="Current Passcode"
                value={currentPasscode}
                onChangeText={(text) => updateField('currentPasscode', text)}
                placeholder="Enter current passcode"
                inputType="password"
                keyboardType="numeric"
                maxLength={6}
                error={errors.currentPasscode}
                secureTextEntry={true}
              />

              <RegisterAuthInput
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
            </View>

            {/* Forgot Passcode Link */}
            <TouchableOpacity onPress={handleForgotPasscode} style={styles.forgotLink}>
              <Text style={styles.forgotText}>Forgot Passcode?</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.footer}>
            <Button
              title={changePasscodeMutation.isPending ? 'Changing Passcode...' : 'Change Passcode'}
              variant={isFormValid() ? "primary" : "secondary"}
              size="lg"
              fullWidth
              onPress={handleSubmit}
              disabled={!isFormValid() || changePasscodeMutation.isPending}
              loading={changePasscodeMutation.isPending}
            />
          </View>
        </KeyboardAvoidingView>

        {/* Activity Indicator Overlay */}
        {changePasscodeMutation.isPending && (
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
  forgotLink: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  forgotText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.clashDisplay.medium,
    color: '#FFE66C',
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