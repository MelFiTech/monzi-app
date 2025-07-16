import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import RegisterAuthInput from '@/components/auth/Register-AuthInput';
import Button from '@/components/common/Button';
import { useVerifyBVN, useKYCStep } from '@/hooks/useKYCService';
import { useAuth } from '@/hooks/useAuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BVNScreen() {
  const [bvn, setBvn] = useState('');
  const [error, setError] = useState('');
  const bvnInputRef = useRef<TextInput>(null);

  // React Query hooks
  const verifyBVNMutation = useVerifyBVN();
  const { currentStep, statusMessage } = useKYCStep();
  const { logout } = useAuth();

  // Set global KYC flow flag when BVN screen mounts
  useEffect(() => {
    const setKYCFlowFlag = async () => {
      try {
        await AsyncStorage.setItem('is_in_kyc_flow', 'true');
        console.log('🎯 BVN Screen: Set KYC flow flag to prevent verification modal');
      } catch (error) {
        console.error('Error setting KYC flow flag:', error);
      }
    };
    
    setKYCFlowFlag();
    
    // Clear flag when component unmounts
    return () => {
      const clearKYCFlowFlag = async () => {
        try {
          await AsyncStorage.removeItem('is_in_kyc_flow');
          console.log('🔄 BVN Screen: Cleared KYC flow flag on unmount');
        } catch (error) {
          console.error('Error clearing KYC flow flag:', error);
        }
      };
      clearKYCFlowFlag();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      bvnInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const formatBVN = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned.slice(0, 11);
  }, []);

  const validateBVN = useCallback((bvnNumber: string) => {
    const cleaned = bvnNumber.replace(/\D/g, '');
    return cleaned.length === 11;
  }, []);

  const isValidBVN = useMemo(() => validateBVN(bvn), [bvn, validateBVN]);

  const handleBVNChange = useCallback((text: string) => {
    const formatted = formatBVN(text);
    setBvn(formatted);
    setError('');
  }, [formatBVN]);

  const handleContinue = useCallback(async () => {
    if (verifyBVNMutation.isPending) return;
    
    if (!bvn.trim()) {
      setError('Please enter your BVN');
      return;
    }
    
    if (!isValidBVN) {
      setError('Please enter a valid 11-digit BVN');
      return;
    }
    
    setError('');
    
    try {
      // Use React Query mutation to verify BVN
      verifyBVNMutation.mutate({ bvn });
    } catch (error) {
      console.error('BVN submission error:', error);
      setError('Failed to submit BVN. Please try again.');
    }
  }, [bvn, isValidBVN, verifyBVNMutation]);

  const handleSignOut = useCallback(async () => {
    try {
      await logout.mutateAsync({ clearAllData: true });
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even if logout fails
      router.replace('/(auth)/login');
    }
  }, [logout]);

  return (
    <SafeAreaView style={styles.container}> 
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.main}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Enter your BVN</Text>
              <Text style={styles.subtitle}>
                We need your BVN for id verification only
              </Text>
            </View>
            <View style={styles.form}>
              <RegisterAuthInput
                ref={bvnInputRef}
                label="BVN"
                placeholder="Enter your 11-digit BVN"
                value={bvn}
                onChangeText={handleBVNChange}
                keyboardType="numeric"
                maxLength={11}
                error={error}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                secureTextEntry={false}
              />
              <Text style={styles.helperText}>
                Your BVN is safe and secure with us
              </Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Button
              title={verifyBVNMutation.isPending ? "Verifying..." : "Next"}
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleContinue}
              disabled={verifyBVNMutation.isPending || !isValidBVN}
              loading={verifyBVNMutation.isPending}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  main: {
    flex: 1,
    minHeight: 300,
    paddingBottom: 40,
  },
  titleSection: {
    paddingTop: 0,
    marginBottom: 10,
  },
  title: {
    fontSize: fontSizes['4xl'],
    fontFamily: fontFamilies.clashDisplay.semibold,
    lineHeight: fontSizes['4xl'] * 1.2,
    marginTop: -10,
    marginBottom: 8,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    lineHeight: fontSizes.base * 1.4,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  form: {
    paddingTop: 20,
  },
  helperText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    marginTop: 12,
    textAlign: 'left',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 34,
    paddingTop: 20,
  },
}); 