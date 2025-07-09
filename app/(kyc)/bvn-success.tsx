import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  Image,
} from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from '@/components/common/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthHeader } from '@/components/auth/AuthHeader';

export default function BVNSuccessScreen() {
  const handleDone = async () => {
    try {
      await AsyncStorage.setItem('bvn_completed', 'true');
      router.replace('/(kyc)/bridge');
    } catch (error) {
      console.error('Error saving BVN completion status:', error);
      router.replace('/(kyc)/bridge');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}> 
      <AuthHeader />
      <View style={styles.content}>
        <View style={styles.successSection}>
          <Image 
            source={require('@/assets/images/verify/check.png')} 
            style={styles.checkIcon}
            resizeMode="contain"
          />
          <Text style={[styles.successText, { color: Colors.dark.white }]}>BVN Verification{"\n"}successful</Text>
        </View>
        <View style={styles.footer}>
          <Button
            title="Done"
            variant="primary"
            size="lg"
            style={{ backgroundColor: Colors.dark.primary, width: '100%' }}
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
  },
  footer: {
    paddingBottom: 14,
    width: '100%',
  },
}); 