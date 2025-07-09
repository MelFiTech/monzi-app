import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useKYCStatus } from '@/hooks/useKYCService';

export default function SelfieLoaderScreen() {
  const { data: kycStatus } = useKYCStatus();

  useEffect(() => {
    // Monitor KYC status and navigate accordingly
    if (kycStatus) {
      if (kycStatus.kycStatus === 'VERIFIED' && kycStatus.selfieVerified) {
        // Selfie verification successful and KYC completed
        const timer = setTimeout(() => {
          router.replace('/(kyc)/bridge');
        }, 2000);
        return () => clearTimeout(timer);
      } else if (kycStatus.kycStatus === 'UNDER_REVIEW') {
        // Selfie under admin review
        const timer = setTimeout(() => {
          router.replace('/(kyc)/bridge');
        }, 2000);
        return () => clearTimeout(timer);
      } else if (kycStatus.kycStatus === 'REJECTED') {
        // Selfie verification failed
        const timer = setTimeout(() => {
          router.replace('/(kyc)/bridge');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [kycStatus]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}> 
      <AuthHeader />
      <View style={styles.content}>
        <View style={styles.loadingSection}>
          <ActivityIndicator 
            size="large" 
            color={Colors.dark.white}
            style={styles.loader}
          />
          <Text style={[styles.loadingText, { color: Colors.dark.white }]}>Uploading selfie...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginBottom: 24,
  },
  loadingText: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamilies.clashDisplay.semibold,
    textAlign: 'center',
  },
}); 