import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from '@/components/common/Button';
import { useUploadSelfie } from '@/hooks/useKYCService';
import { useAuth } from '@/hooks/useAuthService';

const { width: screenWidth } = Dimensions.get('window');
const CIRCLE_SIZE = screenWidth * 0.85;

export default function PhotoReviewScreen() {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const uploadSelfieMutation = useUploadSelfie();
  const { logout } = useAuth();

  const handleRetake = () => {
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

  const handleSubmit = async () => {
    if (!photoUri) {
      console.error('No photo URI available');
      return;
    }

    try {
      // For React Native, create a file object that FormData can handle
      const fileObject = {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'selfie.jpg',
      };
      
      console.log('📤 Preparing selfie upload:', fileObject);
      
      // Upload using React Query
      uploadSelfieMutation.mutate(fileObject);
    } catch (error) {
      console.error('Error preparing selfie for upload:', error);
      router.replace('/(kyc)/selfie-loader');
    }
  };

  return (
    <SafeAreaView style={styles.container}> 
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.photoContainer}>
        <View style={styles.circularImageContainer}>
          <Image 
            source={{ uri: photoUri }} 
            style={styles.photoImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>Ensure your face is clearly visible and lightening is good</Text>
        </View>
      </View>
      <View style={styles.controlsContainer}>
        <View style={styles.buttonContainer}>
          <Button
            title="Retake selfie"
            variant="secondary"
            size="lg"
            onPress={handleRetake}
            style={styles.button}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title={uploadSelfieMutation.isPending ? "Uploading..." : "Submit"}
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            disabled={uploadSelfieMutation.isPending}
            loading={uploadSelfieMutation.isPending}
            style={styles.button}
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
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  circularImageContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 32,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  instructionText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    textAlign: 'center',
    lineHeight: fontSizes.base * 1.5,
    maxWidth: 280,
    color: '#FFFFFF',
  },
  controlsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 20,
    gap: 12,
  },
  buttonContainer: {
    flex: 1,
  },
  button: {
    width: '100%',
  },
}); 