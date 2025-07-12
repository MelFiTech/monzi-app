import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuthService';
import { useKYCStatus } from '@/hooks/useKYCService';

export default function AppIndex() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  // Only fetch KYC status when authenticated to prevent API calls after logout
  const { data: kycStatus, isLoading: kycLoading } = useKYCStatus();

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        // User is authenticated, check KYC status
        if (!kycLoading && kycStatus) {
          console.log('📋 KYC Status:', kycStatus);
          
          // Navigate based on KYC status - strict verification flow
          if ((kycStatus.kycStatus === 'VERIFIED' || kycStatus.kycStatus === 'APPROVED') && kycStatus.isVerified && kycStatus.bvnVerified && kycStatus.selfieVerified) {
            // Only fully verified/approved users can access home screen
            router.replace('/(tabs)');
          } else if (kycStatus.kycStatus === 'IN_PROGRESS' && kycStatus.bvnVerified && !kycStatus.selfieVerified) {
            // BVN verified but selfie needed - go to bridge to continue
            router.replace('/(kyc)/bridge');
          } else if (kycStatus.kycStatus === 'UNDER_REVIEW') {
            // Under review - go to bridge
            router.replace('/(kyc)/bridge');
          } else if (kycStatus.kycStatus === 'REJECTED') {
            // Rejected - go to bridge with error messaging
            router.replace('/(kyc)/bridge');
          } else {
            // User needs to start/complete KYC - start with BVN
            router.replace('/(kyc)/bvn');
          }
        } else if (!kycLoading && !kycStatus && isAuthenticated) {
          // KYC status failed to load (network error) - default to BVN
          console.log('❌ KYC Status failed to load, defaulting to BVN screen');
          router.replace('/(kyc)/bvn');
        }
      } else {
        // User is not authenticated, start auth flow
        console.log('🚪 User not authenticated, redirecting to auth flow');
        router.replace('/(auth)/splash');
      }
    }
  }, [authLoading, isAuthenticated, kycLoading, kycStatus]);

  // Show loading screen while checking auth and KYC status
  if (authLoading || (isAuthenticated && kycLoading)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Return null while navigation is happening to prevent flicker
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 