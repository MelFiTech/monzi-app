import React from 'react';
import { View, Text, StyleSheet, ImageBackground, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { fontFamilies } from '@/constants/fonts';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/common';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();

  const handleContinue = () => {
    router.push('/(auth)/register');
    // router.push('/(kyc)/bridge');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
    //router.push('/(auth)/verify-otp');
    //router.push('/test-push');
    // router.push('/(kyc)/camera');
    //router.push('/transfer-success');
    // router.push('/(auth)/passcode-lock');

  };

  const handleDevPreview = () => {
    router.push('/dev-preview');
  };

  // Calculate responsive font size and line height
  const titleFontSize = Math.min(height * 0.055, 45); // Cap at original 44
  const titleLineHeight = titleFontSize + 2; // Ensure line height is slightly larger than font size

  return (
    <ImageBackground 
      source={require('@/assets/images/onboarding/intro-bg.png')}
      style={[styles.container, { backgroundColor: '#000000' }]}
      resizeMode="cover"
    >
      {/* Dev Button - Top Right */}
      <TouchableOpacity 
        style={styles.devButton}
        onPress={handleDevPreview}
        activeOpacity={0.7}
      >
        <Ionicons name="code-slash" size={20} color="#FFE66C" />
        <Text style={styles.devButtonText}>DEV</Text>
      </TouchableOpacity>

      <View style={[styles.content, { paddingTop: height * 0.65 }]}>
        <Text style={[
          styles.title, 
          { 
            fontSize: titleFontSize,
            lineHeight: titleLineHeight,
            height: titleLineHeight * 2.2 // Ensure space for two lines
          }
        ]}>
          Snap bank{'\n'}info to Pay
        </Text>
        <Text style={[styles.subtitle, { fontSize: Math.min(height * 0.022, 18) }]}>
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
    paddingBottom: 40,
  },
  title: {
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamilies.sora.regular,
    color: 'rgb(255, 255, 255)',
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 20,
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
  },
  devButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1000,
  },
  devButtonText: {
    color: '#FFE66C',
    fontSize: 12,
    fontFamily: fontFamilies.sora.semiBold,
    letterSpacing: 0.5,
  }
});