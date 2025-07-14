import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Animated
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { useAuth } from '@/hooks/useAuthService';
import { X, RotateCcw, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CIRCLE_SIZE = screenWidth * 0.8;

export default function CameraScreen() {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { logout } = useAuth();
  const params = useLocalSearchParams();
  const overlayAnimation = useRef(new Animated.Value(0)).current;

  // Handle error overlay when returning from failed processing
  useEffect(() => {
    if (params.error) {
      setShowErrorOverlay(true);
      
      // Show overlay with fade-in animation
      Animated.timing(overlayAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Hide overlay after 4 seconds
      const timer = setTimeout(() => {
        Animated.timing(overlayAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowErrorOverlay(false);
        });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [params.error, overlayAnimation]);

  const handleSignOut = async () => {
    try {
      await logout.mutateAsync({ clearAllData: true });
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/(auth)/login');
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.colors.primary[400]} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}> 
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera access is required for identity verification</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9, // Higher quality for KYC verification
          base64: false,
          exif: false,
          skipProcessing: false // Enable processing for better quality
        });
        
        if (photo && photo.uri) {
          router.push({ 
            pathname: '/(kyc)/photo-review', 
            params: { photoUri: photo.uri } 
          });
        } else {
          throw new Error('Failed to capture photo');
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert(
          'Camera Error',
          'Failed to take picture. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const flipCamera = () => {
    setFacing((current: 'front' | 'back') => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        ref={cameraRef}
      />
      
      {/* Header */}
      <SafeAreaView style={styles.headerOverlay}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Face Outline */}
      <View style={styles.overlay}>
        <View style={styles.circleContainer}>
          <View style={styles.circle} />
        </View>
      </View>
      
      {/* Error Overlay */}
      {showErrorOverlay && (
        <Animated.View style={[styles.errorOverlay, { opacity: overlayAnimation }]}>
          <View style={styles.errorContainer}>
            <AlertCircle size={24} color="#FF4444" />
            <Text style={styles.errorTitle}>Photo Processing Failed</Text>
            <Text style={styles.errorMessage}>
              {params.error || 'Please ensure your face is clearly visible with good lighting and try again'}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setShowErrorOverlay(false);
                overlayAnimation.setValue(0);
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
      
      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionText}>
          Position your face within the circle{'\n'}
          Ensure good lighting and clear visibility{'\n'}
          Remove glasses if possible
        </Text>
      </View>
      
      {/* Camera Controls */}
      <SafeAreaView style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.flipButton} 
          onPress={flipCamera}
        >
          <RotateCcw size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={takePicture}
          disabled={isCapturing}
          style={[styles.captureButton, { opacity: isCapturing ? 0.5 : 1 }]}
        >
          <View style={styles.captureButtonInner}>
            <View style={styles.captureButtonCore} />
          </View>
        </TouchableOpacity>
        
        <View style={styles.placeholder} />
      </SafeAreaView>
    </View>
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.regular,
    textAlign: 'center',
    marginBottom: 24,
    color: '#FFFFFF',
  },
  permissionButton: {
    backgroundColor: Colors.colors.primary[400],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#000000',
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.bold,
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 24,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3,
    backgroundColor: 'transparent',
    borderColor: '#FFFFFF',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  instructionText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.medium,
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 16,
  },
  captureButton: {
    width: 90,
    height: 90,
    borderRadius: 100,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    width: 50,
    height: 50,
    marginRight: 16,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.71)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    alignItems: 'center',
    maxWidth: screenWidth * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.bold,
    color: '#FF4444',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.colors.primary[400],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.bold,
  },
});