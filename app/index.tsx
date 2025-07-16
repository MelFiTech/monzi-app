import React, { useEffect } from 'react';
import { router } from 'expo-router';

export default function AppIndex() {
  useEffect(() => {
    // Always start with splash screen - it handles all auth logic
    router.replace('/(auth)/splash');
  }, []);

  // Return null to prevent any flicker
  return null;
}