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
import { useAuth } from '@/hooks/useAuthService';

export default function BiometricsScreen() {
  const { logout } = useAuth();

  const handleTakeSelfie = () => {
    router.push('/(kyc)/camera');
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

  const instructions = [
    'Ensure your face is clearly visible.',
    'Remove hats, glasses, or face coverings.',
    'Make sure your environment has lightening',
    'Hold your device at eye level and look directly at the camera',
    'Position your face within the frame and stay still.'
  ];

  return (
    <SafeAreaView style={styles.container}> 
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image 
            source={require('../../assets/images/verify/face-dark.png')}
            style={styles.faceIcon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>Take a quick selfie</Text>
          <Text style={styles.subtitle}>Scan your face to verify your identity</Text>
        </View>
        <View style={styles.instructionsContainer}> 
          {instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <View style={styles.bullet} />
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          title="Take Selfie"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleTakeSelfie}
        />
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
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  faceIcon: {
    width: 120,
    height: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: fontSizes['4xl'],
    fontFamily: fontFamilies.clashDisplay.semibold,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: fontSizes['4xl'] * 1.2,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    textAlign: 'center',
    lineHeight: fontSizes.base * 1.4,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  instructionsContainer: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  instructionText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    lineHeight: fontSizes.base * 1.4,
    flex: 1,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 20,
  },
}); 