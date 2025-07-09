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
import { useKYCStatus } from '@/hooks/useKYCService';

export default function BVNLoaderScreen() {
  const { data: kycStatus } = useKYCStatus();

  useEffect(() => {
    // Monitor KYC status and navigate accordingly
    if (kycStatus) {
      if (kycStatus.kycStatus === 'IN_PROGRESS' && kycStatus.bvnVerified) {
        // BVN verification successful, go to success screen
        const timer = setTimeout(() => {
          router.replace('/(kyc)/bvn-success');
        }, 2000);
        return () => clearTimeout(timer);
      } else if (kycStatus.kycStatus === 'REJECTED') {
        // BVN verification failed, go back to BVN screen with error
        router.replace('/(kyc)/bvn');
      }
    }
  }, [kycStatus]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}> 
      <View style={styles.content}>
        <View style={styles.loadingSection}>
          <ActivityIndicator 
            size="large" 
            color={Colors.dark.white}
            style={styles.loader}
          />
          <Text style={[styles.loadingText, { color: Colors.dark.white }]}>Verifying BVN...</Text>
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