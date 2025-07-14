import React, { useEffect, useState } from 'react';
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
import { ImageOptimizationService } from '@/services';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');
const CIRCLE_SIZE = screenWidth * 0.85;

export default function PhotoReviewScreen() {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const uploadSelfieMutation = useUploadSelfie();
  const { logout } = useAuth();
  const [retryCount, setRetryCount] = useState(0);

  // Handle upload errors - navigate back to camera with error message
  useEffect(() => {
    if (uploadSelfieMutation.isError) {
      const errorMessage = uploadSelfieMutation.error?.message || 'Photo processing failed. Please try again.';
      console.error('❌ Selfie upload failed:', errorMessage);
      
      // Check retry count - after 3 attempts, go to contact support
      if (retryCount >= 2) {
        console.log('🚨 Max retries reached, routing to contact support');
        AsyncStorage.setItem('kyc_requires_support', 'true');
        router.push('/(kyc)/bridge');
        return;
      }
      
      // Navigate back to camera with error message
      router.push({
        pathname: '/(kyc)/camera',
        params: { 
          error: errorMessage 
        }
      });
    }
  }, [uploadSelfieMutation.isError, uploadSelfieMutation.error, retryCount]);

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
      console.log('🖼️ Starting image optimization for KYC selfie...');
      
      // Optimize image for KYC upload
      const optimizedImage = await ImageOptimizationService.fastOptimize(photoUri);
      console.log(`📊 Image optimized: ${optimizedImage.compressionRatio.toFixed(1)}x smaller`);
      
      // Create file object with optimized image
      const fileObject = {
        uri: optimizedImage.uri,
        type: 'image/jpeg',
        name: 'selfie.jpg',
      };
      
      console.log('📤 Preparing optimized selfie upload:', fileObject);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      // Upload using React Query
      uploadSelfieMutation.mutate(fileObject);
    } catch (error) {
      console.error('Error optimizing or preparing selfie for upload:', error);
      
      // Fallback to original image if optimization fails
      console.log('🔄 Falling back to original image due to optimization error');
      const fileObject = {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'selfie.jpg',
      };
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      uploadSelfieMutation.mutate(fileObject);
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