import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { AppState, TouchableWithoutFeedback, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateLastActivity, shouldRequireReauth, INACTIVITY_TIMEOUT_MS } from '@/hooks/useInactivityService';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/common/useColorScheme';
import { QueryProvider } from '@/providers/QueryProvider';
import { CustomThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import ToastProvider from '@/providers/ToastProvider';
import {
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';

// Import NativeWind styles (temporarily disabled)
// import '../global.css';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Start with index (auth state checker)
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Sora Google Fonts
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    
    // Clash Display Local Fonts
    'ClashDisplay-Extralight': require('../assets/fonts/ClashDisplay-Extralight.otf'),
    'ClashDisplay-Light': require('../assets/fonts/ClashDisplay-Light.otf'),
    'ClashDisplay-Regular': require('../assets/fonts/ClashDisplay-Regular.otf'),
    'ClashDisplay-Medium': require('../assets/fonts/ClashDisplay-Medium.otf'),
    'ClashDisplay-Semibold': require('../assets/fonts/ClashDisplay-Semibold.otf'),
    'ClashDisplay-Bold': require('../assets/fonts/ClashDisplay-Bold.otf'),
    
    // Keep existing fonts
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Only hide splash screen when fonts are loaded to prevent white flash
  useEffect(() => {
    if (loaded) {
      // Let the splash screen component handle hiding
      // We don't hide here to prevent white flash
    }
  }, [loaded]);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to clear and restart inactivity timer
  const resetInactivityTimer = async () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(async () => {
      await AsyncStorage.setItem('requireReauth', 'true');
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    // Listen for app state changes
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        // On resume, check inactivity
        const requireReauth = await shouldRequireReauth();
        if (requireReauth) {
          await AsyncStorage.setItem('requireReauth', 'true');
        }
        // Always update last activity on resume
        await updateLastActivity();
        resetInactivityTimer();
      } else if (nextAppState === 'background') {
        if (inactivityTimer.current) {
          clearTimeout(inactivityTimer.current);
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    // Start timer on mount
    resetInactivityTimer();
    return () => {
      sub.remove();
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, []);

  // Global touch handler to update last activity and reset timer
  const handleGlobalTouch = async () => {
    await updateLastActivity();
    await AsyncStorage.setItem('requireReauth', 'false');
    resetInactivityTimer();
  };

  // Show a loading view while fonts are loading to prevent white flash
  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFE66C' }}>
        {/* Empty view with splash background color to prevent white flash */}
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={handleGlobalTouch}>
      <RootLayoutNav />
    </TouchableWithoutFeedback>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <QueryProvider>
    <AuthProvider>
        <CustomThemeProvider>
          <ToastProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen name="transfer" options={{ headerShown: false }} />
                <Stack.Screen name="transfer-success" options={{ headerShown: false }} />
                <Stack.Screen name="transfer-loader" options={{ headerShown: false }} />
                <Stack.Screen name="(kyc)" options={{ headerShown: false }} />
                <Stack.Screen name="security" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="change-pin" options={{ headerShown: false }} />
                <Stack.Screen name="forgot-pin" options={{ headerShown: false }} />
                <Stack.Screen name="reset-pin" options={{ headerShown: false }} />
                <Stack.Screen name="change-passcode" options={{ headerShown: false }} />
                <Stack.Screen name="forgot-passcode" options={{ headerShown: false }} />
                <Stack.Screen name="delete-account" options={{ headerShown: false }} />
                <Stack.Screen name="delete-reason" options={{ headerShown: false }} />
                <Stack.Screen name="delete-success" options={{ headerShown: false }} />

              </Stack>
            </ThemeProvider>
          </ToastProvider>
        </CustomThemeProvider>
      </AuthProvider>
      </QueryProvider>
  );
}
