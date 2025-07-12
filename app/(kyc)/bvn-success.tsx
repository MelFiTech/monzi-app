import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  Image,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from '@/components/common/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuthService';

export default function BVNSuccessScreen() {
  const { logout } = useAuth();

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem('bvn_completed', 'true');
      router.replace('/(kyc)/bridge');
    } catch (error) {
      console.error('Error saving BVN completion status:', error);
      router.replace('/(kyc)/bridge');
    }
  };

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
        <View style={styles.successSection}>
          <Image 
            source={require('@/assets/images/verify/check.png')} 
            style={styles.checkIcon}
            resizeMode="contain"
          />
          <Text style={styles.successText}>BVN Verification{"\n"}successful</Text>
        </View>
        <View style={styles.footer}>
          <Button
            title="Done"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleDone}
          />
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
  successSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    width: 80,
    height: 80,
    marginBottom: 32,
  },
  successText: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamilies.sora.bold,
    textAlign: 'center',
    lineHeight: fontSizes['2xl'] * 1.2,
    color: '#FFFFFF',
  },
  footer: {
    paddingBottom: 34,
    paddingTop: 20,
    width: '100%',
  },
}); 