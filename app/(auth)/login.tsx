import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from '@/components/common/Button';
import { AuthHeader } from '@/components/auth/AuthHeader';
import RegisterAuthInput from '@/components/auth/Register-AuthInput';
import { useLogin } from '@/hooks';
import { useAuth } from '@/providers/AuthProvider';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isValid, setIsValid] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const loginMutation = useLogin();
  const { checkAuthState } = useAuth();

  useEffect(() => {
    // Auto focus email input on mount
    setTimeout(() => {
      emailRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    // Validate email and passcode
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isEmailValid = email.trim() !== '' && emailRegex.test(email.trim());
    const isPasscodeValid = passcode.length === 6;
    
    setIsValid(isEmailValid && isPasscodeValid);
  }, [email, passcode]);

  const handleLogin = async () => {
    if (!isValid) return;
    
    try {
      console.log('Login attempt with:', { email, passcode });
      
      const result = await loginMutation.mutateAsync({
        email: email.trim(),
        passcode: passcode.trim(),
      });
      
      if (result.success) {
        await checkAuthState();
        // After successful login, go directly to home screen
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'Login failed. Please try again.');
    }
  };

  const handleClose = () => {
    router.replace('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <AuthHeader variant="close" onBack={handleClose} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Title Section */}
            <View style={[styles.titleSection, { marginTop: 24 }]}>
              <Text style={styles.title}>Log in</Text>
              <Text style={styles.subtitle}>Welcome Back!</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
                              <RegisterAuthInput
                  ref={emailRef}
                  label="Email"
                  value={email}
                  onChangeText={(text) => setEmail(text.trim())}
                  placeholder="justjames@gmail.com"
                  inputType="email"
                  style={styles.authInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />

              <RegisterAuthInput
                label="Passcode"
                value={passcode}
                onChangeText={(text) => {
                  // Only allow digits
                  const numbersOnly = text.replace(/[^0-9]/g, '');
                  if (numbersOnly.length <= 6) {
                    setPasscode(numbersOnly);
                  }
                }}
                placeholder="******"
                inputType="password"
                style={styles.authInput}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <Button
              title={loginMutation.isPending ? 'Logging in...' : 'Login'}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={!isValid || loginMutation.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: -10,
    paddingTop: -16,
    marginBottom: -40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleSection: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 24,
  },
  form: {
    gap: 8,
  },
  authInput: {
    marginBottom: 8,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 14,
    paddingTop: 20,
  },
  loginButton: {
    height: 56,
  },
});