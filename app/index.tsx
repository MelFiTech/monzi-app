import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export default function AppIndex() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading, checkAuthState } = useAuth();

  useEffect(() => {
    handleAuthCheck();
  }, []);

  const handleAuthCheck = async () => {
    const authenticated = await checkAuthState();
    
    if (authenticated) {
      // User is authenticated, go directly to main app
      router.replace('/(tabs)');
    } else {
      // User is not authenticated, start auth flow
      router.replace('/(auth)/splash');
    }
  };

  // Show loading screen while checking auth
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} />
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
}); 