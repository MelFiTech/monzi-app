import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
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
                <Stack.Screen name="(kyc)" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="transfer-success" options={{ headerShown: false }} />
              </Stack>
            </ThemeProvider>
          </ToastProvider>
        </CustomThemeProvider>
      </AuthProvider>
      </QueryProvider>
  );
}
