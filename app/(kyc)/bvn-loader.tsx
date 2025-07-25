import React, { useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { useKYCStatus } from '@/hooks/useKYCService';
import { useAuth } from '@/hooks/useAuthService';

export default function BVNLoaderScreen() {
  const { data: kycStatus } = useKYCStatus();
  const { logout } = useAuth();
  const navigation = useNavigation();

  // Block hardware back button on Android and disable gestures
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        console.log('🔒 Hardware back button blocked on BVN loader screen');
        return true; // Prevent default behavior (going back)
      });

      // Disable swipe gestures using navigation options
      navigation.setOptions({
        gestureEnabled: false,
      });

      console.log('🔒 Swipe gestures disabled for BVN loader screen');

      return () => {
        backHandler.remove();
        // Re-enable gestures when leaving screen
        navigation.setOptions({
          gestureEnabled: true,
        });
        console.log('✅ Swipe gestures re-enabled');
      };
    }, [navigation])
  );

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
          <Text style={styles.loadingText}>Verifying BVN...</Text>
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