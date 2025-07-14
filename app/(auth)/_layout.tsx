import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

export const unstable_settings = {
  // Start with splash in auth flow
  initialRouteName: 'splash',
};

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        // Disable swipe back gestures in auth flow
        gestureEnabled: false,
        // Hide back button in header
        headerBackVisible: false,
      }}
    >
      <Stack.Screen 
        name="splash" 
        options={{ 
          title: 'Splash',
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          title: 'Onboarding',
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="chat" 
        options={{ 
          title: 'Account Setup',
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ 
          title: 'Register',
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Login',
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="verify-otp" 
        options={{ 
          title: 'Verify OTP',
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{ 
          title: 'Reset Password',
          presentation: 'modal',
          gestureEnabled: false,
        }} 
      />
 <Stack.Screen 
        name="passcode-lock" 
        options={{ 
          title: 'Passcode Lock',
          headerShown: false,
          gestureEnabled: false,
        }} 
      />

    </Stack>
  );
} 