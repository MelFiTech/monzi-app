import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  Image,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from '@/components/common/Button';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useUploadSelfie } from '@/hooks/useKYCService';

const { width: screenWidth } = Dimensions.get('window');
const CIRCLE_SIZE = screenWidth * 0.85;

export default function PhotoReviewScreen() {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const uploadSelfieMutation = useUploadSelfie();

  const handleRetake = () => {
    router.push('/(kyc)/camera');
  };

  const handleSubmit = async () => {
    if (!photoUri) {
      console.error('No photo URI available');
      return;
    }

    try {
      // Create a file-like object from the photo URI
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      // Create a File object for the upload
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      
      // Upload using React Query
      uploadSelfieMutation.mutate(file);
    } catch (error) {
      console.error('Error preparing selfie for upload:', error);
      router.replace('/(kyc)/selfie-loader');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}> 
      <AuthHeader />
      <View style={styles.photoContainer}>
        <View style={styles.circularImageContainer}>
          <Image 
            source={{ uri: photoUri }} 
            style={styles.photoImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.instructionsContainer}>
          <Text style={[styles.instructionText, { color: Colors.dark.white }]}>Ensure your face is clearly visible and lightening is good</Text>
        </View>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          title="Retake selfie"
          variant="secondary"
          size="lg"
          style={{ backgroundColor: Colors.dark.primary, borderRadius: 24, width: '48%' }}
          textStyle={{ color: Colors.dark.black, fontSize: fontSizes.base, fontFamily: fontFamilies.sora.bold }}
          onPress={handleRetake}
        />
        <Button
          title={uploadSelfieMutation.isPending ? "Uploading..." : "Submit"}
          variant="primary"
          size="lg"
          style={{ backgroundColor: Colors.dark.primary, borderRadius: 24, width: '48%' }}
          textStyle={{ color: Colors.dark.black, fontSize: fontSizes.base, fontFamily: fontFamilies.sora.bold }}
          onPress={handleSubmit}
          disabled={uploadSelfieMutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 10,
    gap: 12,
  },
}); 