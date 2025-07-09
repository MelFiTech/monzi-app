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
import { AuthHeader } from '@/components/auth/AuthHeader';

export default function BiometricsScreen() {
  const handleTakeSelfie = () => {
    router.push('/(kyc)/camera');
  };

  const instructions = [
    'Ensure your face is clearly visible.',
    'Remove hats, glasses, or face coverings.',
    'Make sure your environment has lightening',
    'Hold your device at eye level and look directly at the camera',
    'Position your face within the frame and stay still.'
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}> 
      <AuthHeader />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image 
            source={require('@/assets/images/verify/face-dark.png')}
            style={styles.faceIcon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors.dark.white }]}>Take a quick selfie</Text>
          <Text style={[styles.subtitle, { color: Colors.dark.textSecondary }]}>Scan your face to verify your identity</Text>
        </View>
        <View style={[styles.instructionsContainer, { backgroundColor: Colors.dark.surfaceVariant }]}> 
          {instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <View style={[styles.bullet, { backgroundColor: Colors.dark.textTertiary }]} />
              <Text style={[styles.instructionText, { color: Colors.dark.textSecondary }]}>{instruction}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          title="Take Selfie"
          variant="primary"
          size="lg"
          style={{ backgroundColor: Colors.dark.primary, width: '100%' }}
          textStyle={{ color: Colors.dark.black }}
          onPress={handleTakeSelfie}
        />
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
  },
  subtitle: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    textAlign: 'center',
    lineHeight: fontSizes.base * 1.4,
  },
  instructionsContainer: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
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
  },
  instructionText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    lineHeight: fontSizes.base * 1.4,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
}); 