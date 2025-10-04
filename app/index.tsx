import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { View, Text } from 'react-native';
import { fontFamilies } from '@/constants/fonts';

export default function AppIndex() {
  const { isAuthenticated, isLoading } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasNavigated) {
      setHasNavigated(true);
      
      if (isAuthenticated) {
        // User is already authenticated - go directly to home
        console.log('✅ User authenticated - going directly to home screen');
        router.replace('/(tabs)');
      } else {
        // User not authenticated - go to splash for auth flow
        console.log('❌ User not authenticated - going to splash screen');
        router.replace('/(auth)/splash');
      }
    }
  }, [isAuthenticated, isLoading, hasNavigated]);

  // Show loading screen while determining navigation
  if (isLoading || !hasNavigated) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#FFE66C' 
      }}>
        <Text style={{ 
          fontFamily: fontFamilies.sora.medium, 
          fontSize: 16, 
          color: '#000000' 
        }}>
          Loading...
        </Text>
      </View>
    );
  }

  // Return null to prevent any flicker
  return null;
}