import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { fontFamilies } from '@/constants/fonts';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/common';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const handleContinue = () => {
    router.push('/(auth)/register');
    // router.push('/(kyc)/bridge');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
    //router.push('/(auth)/verify-otp');
    //router.push('/test-push');
    //router.push('/(kyc)/camera');
    //router.push('/transfer-success');

  };

  return (
    <ImageBackground 
      source={require('@/assets/images/onboarding/intro-bg.png')}
      style={[styles.container, { backgroundColor: '#000000' }]}
      resizeMode="cover"
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          Snap bank{'\n'}info to Pay
        </Text>
        <Text style={styles.subtitle}>
          No typing, no errors. Just snap and{'\n'}send money in seconds.
        </Text>
      </View>

      <View style={styles.bottomSection}>
        <Button
          title="Create Account"
          onPress={handleContinue}
          variant="white"
          size="lg"
          fullWidth
          style={styles.createAccountButton}
        />

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Text onPress={handleLogin} style={styles.loginLink}>Log in</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 580,
    paddingBottom: 40,
  },
  title: {
    fontSize: 44,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 46,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgb(255, 255, 255)',
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: -1,
  },
  bottomSection: {
    paddingBottom: 48,
  },
  createAccountButton: {
    borderRadius: 100,
    marginBottom: 24,
    backgroundColor: '#FFE66C',
    height: 56,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgb(255, 255, 255)',
  },
  loginLink: {
    fontSize: 16,
    color: '#FFE66C',
    fontFamily: fontFamilies.sora.semiBold,
    letterSpacing: -0.3,
  }
});