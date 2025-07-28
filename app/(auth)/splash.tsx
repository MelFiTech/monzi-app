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
import { useAuth } from '@/hooks/useAuthService';
import { useKYCStatus } from '@/hooks/useKYCService';
import { fontFamilies } from '@/constants/fonts';
import { CustomLoader } from '@/components/common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateLastActivity } from '@/hooks/useInactivityService';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function SplashScreenComponent() {
  const { colors } = useTheme();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const [showFallback, setShowFallback] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const biometricService = BiometricService.getInstance();
  const authStorageService = AuthStorageService.getInstance();
  
  // Use auth and KYC hooks for centralized logic
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: kycStatus, isLoading: kycLoading } = useKYCStatus();

  useEffect(() => {
    if (!hasInitialized) {
      initializeSplash();
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  const initializeSplash = async () => {
    // Hide the native splash screen to prevent double splash
    await SplashScreen.hideAsync();
    
    // Start logo animations immediately
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

    // Check if user has biometric setup to reduce delay
    const shouldTryBiometric = await shouldAttemptBiometric();
    const animationDelay = shouldTryBiometric ? 300 : 1200; // Shorter delay for biometric users
    
    // Wait for animations to settle
    await new Promise(resolve => setTimeout(resolve, animationDelay));

    // Check for reauth requirement first
    const requireReauth = await AsyncStorage.getItem('requireReauth');
    if (requireReauth === 'true') {
      await handleReauthFlow();
      return;
    }

    // Start authentication flow
    await handleAuthenticationFlow();
  };

  const handleReauthFlow = async () => {
    const shouldTryBiometric = await shouldAttemptBiometric();
    if (shouldTryBiometric) {
      await attemptBiometricAuth(true);
    } else {
      router.replace('/(auth)/passcode-lock');
    }
  };

  const handleAuthenticationFlow = async () => {
    setIsCheckingAuth(true);
    
    // Wait for auth loading to complete
    if (authLoading) {
      console.log('⏳ Waiting for auth hook to finish loading...');
      return;
    }

    if (isAuthenticated) {
      console.log('✅ User is authenticated, checking for biometric setup...');
      // User is authenticated, proceed with biometric or navigation
      const shouldTryBiometric = await shouldAttemptBiometric();
      
      if (shouldTryBiometric) {
        await attemptBiometricAuth(false);
      } else {
        // User is authenticated but no biometric, navigate based on KYC
        await navigateBasedOnKYC();
      }
    } else {
      console.log('❌ User is not authenticated, going to onboarding...');
      // User is not authenticated, go to onboarding
      setTimeout(() => {
        router.replace('/(auth)/onboarding');
      }, 800);
    }
  };

  // Monitor auth status changes only when checking auth
  useEffect(() => {
    if (isCheckingAuth && !authLoading && hasInitialized) {
      console.log('📊 Auth status changed, re-evaluating flow...');
      handleAuthenticationFlow();
    }
  }, [authLoading, isAuthenticated, isCheckingAuth, hasInitialized]);

  // Monitor KYC status for navigation decisions only when needed
  useEffect(() => {
    if (isAuthenticated && !authLoading && !kycLoading && kycStatus && isCheckingAuth && hasInitialized) {
      console.log('📋 KYC status loaded, navigating...');
      navigateBasedOnKYC();
    }
  }, [isAuthenticated, authLoading, kycLoading, kycStatus, isCheckingAuth, hasInitialized]);

  const navigateBasedOnKYC = async () => {
    console.log('📋 KYC Status on Splash:', kycStatus);
    
    // For authenticated users (especially biometric users), go to home screen
    // Let the backend checks in camera screen handle KYC verification through modals
    console.log('🏠 Navigating authenticated user to home screen - backend checks will handle KYC');
    router.replace('/(tabs)');
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

      const shouldAttempt = (
        isBiometricAvailable && 
        authStatus.hasStoredAuth && 
        authStatus.biometricEnabled && 
        authStatus.autoLoginEnabled &&
        !authStatus.isFirstTimeDevice
      );

      console.log('🔐 Biometric eligibility check:', {
        isBiometricAvailable,
        hasStoredAuth: authStatus.hasStoredAuth,
        biometricEnabled: authStatus.biometricEnabled,
        autoLoginEnabled: authStatus.autoLoginEnabled,
        isFirstTimeDevice: authStatus.isFirstTimeDevice,
        shouldAttempt
      });

      return shouldAttempt;
    } catch (error) {
      console.log('Error checking biometric eligibility:', error);
      return false;
    }
  };

  const attemptBiometricAuth = async (isReauth: boolean) => {
    try {
      console.log(`🔐 Attempting biometric authentication (reauth: ${isReauth})...`);
      const result = await biometricService.authenticate();
      
      if (result.success) {
        console.log('✅ Biometric authentication successful');
        // Biometric authentication successful
        const authData = await authStorageService.getAuthData();
        if (authData && await authStorageService.isAuthenticated()) {
          // On reauth, clear flag and update last activity
          if (isReauth) {
            await AsyncStorage.setItem('requireReauth', 'false');
            await updateLastActivity();
            console.log('🏠 Reauth successful, navigating to home');
            // For reauth, go directly to home
            router.replace('/(tabs)');
          } else {
            console.log('📋 Initial auth successful, checking KYC status');
            // Navigate based on KYC status for authenticated users
            await navigateBasedOnKYC();
          }
          return;
        }
      }
      
      console.log('❌ Biometric authentication failed or cancelled');
      // Biometric failed or was cancelled
      if (isReauth) {
        router.replace('/(auth)/passcode-lock');
      } else {
        setShowFallback(true);
      }
    } catch (error) {
      console.log('Biometric authentication error:', error);
      if (isReauth) {
        router.replace('/(auth)/passcode-lock');
      } else {
        setShowFallback(true);
      }
    }
  };

  const handlePasscodeLogin = () => {
    router.replace('/(auth)/login');
  };

  // Show loading indicator during auth checks
  const showLoading = authLoading || (isAuthenticated && kycLoading && isCheckingAuth);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFE66C" />
      
      <Image 
        source={require('@/assets/splash/splash.png')}
        style={styles.splashImage}
        resizeMode="cover"
      />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        
        {showLoading && (
          <View style={styles.loadingContainer}>
            <CustomLoader size="large" color="#000000" />
            <Text style={styles.loadingText}>
              {authLoading ? 'Checking authentication...' : 'Loading your account...'}
            </Text>
          </View>
        )}
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
  splashImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  logo: {
    width: 160,
    height: 80,
  },
  loadingContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: '#000000',
    marginTop: 10,
    textAlign: 'center',
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