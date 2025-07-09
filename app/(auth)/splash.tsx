import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '@/providers/ThemeProvider';
import { BiometricService, AuthStorageService } from '@/services';
import { fontFamilies } from '@/constants/fonts';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function SplashScreenComponent() {
  const { colors } = useTheme();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const [showFallback, setShowFallback] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const biometricService = BiometricService.getInstance();
  const authStorageService = AuthStorageService.getInstance();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Hide the native splash screen and show our custom one
    await SplashScreen.hideAsync();
    
    // Start logo animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Wait a moment for animations to settle
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Check if biometric authentication should be attempted
    const shouldTryBiometric = await shouldAttemptBiometric();
    
    if (shouldTryBiometric) {
      await attemptBiometricAuth();
    } else {
      // No biometric setup or no stored auth, go to onboarding
      setTimeout(() => {
        router.replace('/(auth)/onboarding');
      }, 800);
    }
  };

  const shouldAttemptBiometric = async (): Promise<boolean> => {
    try {
      const authStatus = await authStorageService.getAuthStatus();
      const isBiometricAvailable = await biometricService.isBiometricAvailable();
      
      // Get biometric type for display
      if (isBiometricAvailable) {
        const types = await biometricService.getBiometricType();
        setBiometricType(types[0] || 'Biometric');
      }

      return (
        isBiometricAvailable && 
        authStatus.hasStoredAuth && 
        authStatus.biometricEnabled && 
        authStatus.autoLoginEnabled &&
        !authStatus.isFirstTimeDevice
      );
    } catch (error) {
      console.log('Error checking biometric eligibility:', error);
      return false;
    }
  };

  const attemptBiometricAuth = async () => {
    try {
      const result = await biometricService.authenticate();
      
      if (result.success) {
        // Biometric authentication successful
        const authData = await authStorageService.getAuthData();
        if (authData && await authStorageService.isAuthenticated()) {
          // Navigate to main app
          router.replace('/(tabs)');
          return;
        }
      }
      
      // Biometric failed or was cancelled, show fallback
      setShowFallback(true);
    } catch (error) {
      console.log('Biometric authentication error:', error);
      setShowFallback(true);
    }
  };

  const handlePasscodeLogin = () => {
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: '#FFE66C' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFE66C" />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image 
          source={require('@/assets/images/monzi.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {showFallback && (
        <Animated.View 
          style={[
            styles.fallbackContainer,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.passcodeButton}
            onPress={handlePasscodeLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.passcodeText}>
              Login with Passcode
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 80,
  },
  fallbackContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  passcodeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  passcodeText: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.medium,
    color: '#000000',
    textAlign: 'center',
  },
});