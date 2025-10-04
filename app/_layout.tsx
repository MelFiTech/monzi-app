import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, TouchableWithoutFeedback, View, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateLastActivity, shouldRequireReauth, shouldRequireReauthFromBackground, updateBackgroundActivity, INACTIVITY_TIMEOUT_MS, BACKGROUND_TIMEOUT_MS } from '@/hooks/useInactivityService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/common/useColorScheme';
import { QueryProvider } from '@/providers/QueryProvider';
import { CustomThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import ToastProvider from '@/providers/ToastProvider';
import { AppStateProvider, useAppState } from '@/providers/AppStateProvider';
import { RoutingErrorHandler } from '@/services';
import {
  useFonts as useSoraFonts,
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';

// Initialize background location task
import '@/services/BackgroundLocationTask';

// Import NativeWind styles (temporarily disabled)
// import '../global.css';

export const unstable_settings = {
  // Start with index (auth state checker)
  initialRouteName: 'index',
};

// Custom error boundary for better error handling in production
export function ErrorBoundary({ error }: { error: Error }) {
  console.error('App Error Boundary:', error);
  
  // Handle routing errors specifically
  if (error.message.includes('screen') || error.message.includes('route')) {
    const routingErrorHandler = RoutingErrorHandler.getInstance();
    routingErrorHandler.handleRoutingError(error);
  }
  
  return null; // Let the app handle the error gracefully
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load Sora fonts using Google Fonts package
  const [soraLoaded, soraError] = useSoraFonts({
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  // Load other fonts
  const [otherLoaded, otherError] = useFonts({
    // Clash Display Local Fonts for headers
    'ClashDisplay-Regular': require('../assets/fonts/ClashDisplay-Regular.otf'),
    'ClashDisplay-Medium': require('../assets/fonts/ClashDisplay-Medium.otf'),
    'ClashDisplay-Semibold': require('../assets/fonts/ClashDisplay-Semibold.otf'),
    'ClashDisplay-Bold': require('../assets/fonts/ClashDisplay-Bold.otf'),
    
    // Keep existing fonts
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const loaded = soraLoaded && otherLoaded;
  const error = soraError || otherError;

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) {
      console.warn('⚠️ Font loading error (continuing anyway):', error);
      // Don't throw the error - continue with system fonts
    }
  }, [error]);

  // Hide splash screen when fonts are loaded to prevent white flash
  useEffect(() => {
    if (loaded) {
      // Hide the Expo splash screen when fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Listen for app state changes - check inactivity and background timeout
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        // On resume, check if user was inactive while app was closed
        const requireReauth = await shouldRequireReauth();
        const requireReauthFromBackground = await shouldRequireReauthFromBackground();
        
        if (requireReauth || requireReauthFromBackground) {
          console.log('🔒 Session expired - requiring reauth');
          await AsyncStorage.setItem('requireReauth', 'true');
        }
        // Update last activity on resume
        await updateLastActivity();
      } else if (nextAppState === 'background') {
        // On background, record the time
        console.log('📱 App going to background - recording timestamp');
        await updateBackgroundActivity();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    
    // Set initial last activity on app start
    updateLastActivity();
    
    return () => {
      sub.remove();
    };
  }, []);

  // Show a loading view while fonts are loading to prevent white flash
  // But continue even if fonts fail to load
  if (!loaded && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFE66C' }}>
        {/* Empty view with splash background color to prevent white flash */}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootLayoutNav />
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AppStateProvider>
      <QueryProvider>
        <AuthProvider>
          <CustomThemeProvider>
            <ToastProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="dev-preview" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
                  <Stack.Screen name="profile" options={{ headerShown: false }} />
                  <Stack.Screen name="transfer" options={{ headerShown: false }} />
                  <Stack.Screen name="transfer-success" options={{ headerShown: false }} />
        <Stack.Screen name="bill-success" options={{ headerShown: false }} />
        <Stack.Screen name="airtime-modal" options={{ headerShown: false }} />
        <Stack.Screen name="data-modal" options={{ headerShown: false }} />
        <Stack.Screen name="referral-modal" options={{ presentation: 'modal', headerShown: false }} />
                  <Stack.Screen name="transfer-loader" options={{ headerShown: false }} />
                  <Stack.Screen name="transaction-detail" options={{ headerShown: false }} />
                  <Stack.Screen name="(kyc)" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="security" options={{ presentation: 'modal', headerShown: false }} />
                  <Stack.Screen name="change-pin" options={{ headerShown: false }} />
                  <Stack.Screen name="forgot-pin" options={{ headerShown: false }} />
                  <Stack.Screen name="reset-pin" options={{ headerShown: false }} />
                  <Stack.Screen name="change-passcode" options={{ headerShown: false }} />
                  <Stack.Screen name="forgot-passcode" options={{ headerShown: false }} />
                  <Stack.Screen name="delete-account" options={{ headerShown: false }} />
                  <Stack.Screen name="delete-reason" options={{ headerShown: false }} />
                  <Stack.Screen name="delete-otp" options={{ headerShown: false }} />
                  <Stack.Screen name="delete-success" options={{ headerShown: false }} />

                </Stack>

                {/* Global App Privacy Overlay */}
                <GlobalAppPrivacyOverlay />
              </ThemeProvider>
            </ToastProvider>
          </CustomThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </AppStateProvider>
  );
}

// Separate component that can use the AppStateProvider context
function GlobalAppPrivacyOverlay() {
  const { isAppInBackground } = useAppState();

  return (
    <>
      {/* Global blur overlay when app is in background */}
      {isAppInBackground && (
        <BlurView
          intensity={100}
          tint="dark"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
          }}
        >
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFE66C',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Image 
              source={require('../assets/splash/splash.png')}
              style={{
                width: '80%',
                height: '80%',
              }}
              resizeMode="contain"
            />
          </View>
        </BlurView>
      )}

      {/* Global dark overlay when app is in background */}
      {isAppInBackground && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000000',
          zIndex: 99998,
        }} />
      )}
    </>
  );
}
