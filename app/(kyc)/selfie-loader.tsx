import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKYCStatus } from '@/hooks/useKYCService';
import { useAuth } from '@/hooks/useAuthService';

export default function SelfieLoaderScreen() {
  const { data: kycStatus } = useKYCStatus();
  const { logout } = useAuth();

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

  const handleSignOut = async () => {
    try {
      await logout.mutateAsync({ clearAllData: true });
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/(auth)/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}> 
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.loadingSection}>
          <ActivityIndicator 
            size="large" 
            color="#FFFFFF"
            style={styles.loader}
          />
          <Text style={styles.loadingText}>Uploading selfie...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: '#FFFFFF',
  },
}); 