import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function AppIndex() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
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
  }, [isAuthenticated, isLoading]);

  // Return null to prevent any flicker
  return null;
}