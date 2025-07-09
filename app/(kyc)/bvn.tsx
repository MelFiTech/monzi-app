import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { AuthHeader } from '@/components/auth/AuthHeader';
import RegisterAuthInput from '@/components/auth/Register-AuthInput'; // Fixed import
import Button from '@/components/common/Button';
import { useVerifyBVN, useKYCStep } from '@/hooks/useKYCService';

export default function BVNScreen() {
  const [bvn, setBvn] = useState('');
  const [error, setError] = useState('');
  const bvnInputRef = useRef<TextInput>(null);

  // React Query hooks
  const verifyBVNMutation = useVerifyBVN();
  const { currentStep, statusMessage } = useKYCStep();

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
    
    // Use React Query mutation to verify BVN
    verifyBVNMutation.mutate({ bvn });
  }, [bvn, isValidBVN, verifyBVNMutation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}> 
      <AuthHeader />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.main}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: Colors.dark.white }]}>Enter your BVN</Text>
              <Text style={[styles.subtitle, { color: Colors.dark.textSecondary }]}>We need your BVN for id verification only</Text>
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
              <Text style={[styles.helperText, { color: Colors.dark.textTertiary }]}>Your BVN is safe and secure with us</Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Button
              title={verifyBVNMutation.isPending ? "Verifying..." : "Next"}
              variant="primary"
              size="lg"
              style={{ backgroundColor: Colors.dark.primary, width: '100%' }}
              onPress={handleContinue}
              disabled={verifyBVNMutation.isPending || !isValidBVN}
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
  },
  header: {
    paddingTop: 0,
    marginBottom: 10,
  },
  title: {
    fontSize: fontSizes['4xl'],
    fontFamily: fontFamilies.clashDisplay.semibold, // Fixed casing
    lineHeight: fontSizes['4xl'] * 1.2,
    marginTop: -10,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    lineHeight: fontSizes.base * 1.4,
  },
  form: {
    paddingTop: 20,
  },
  helperText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    marginTop: 12,
    textAlign: 'left',
  },
  footer: {
    paddingBottom: 10,
    marginTop: 34,
  },
}); 