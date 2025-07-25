import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  Dimensions,
  ActivityIndicator,
  Animated
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { useAuth } from '@/hooks/useAuthService';
import { useAppState } from '@/providers/AppStateProvider';
import { X, RotateCcw, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CIRCLE_SIZE = screenWidth * 0.8;

export default function CameraScreen() {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  const { isAppInBackground } = useAppState();
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

  const handleRequestPermission = async () => {
    try {
      console.log('📷 Requesting camera permission for KYC...');
      
      // If permission was denied and can't ask again, open settings directly
      if (permission && permission.canAskAgain === false) {
        console.log('🔧 Opening device settings for camera permission...');
        await Linking.openSettings();
        return;
      }
      
      // Otherwise, try to request permission normally
      await requestPermission();
      
      // Check if permission was granted after request
      if (permission?.granted) {
        console.log('✅ Camera permission granted for KYC');
      } else if (permission && permission.canAskAgain === false) {
        // Permission denied and can't ask again - guide user to settings
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required for identity verification. Please enable camera access in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: async () => {
                try {
                  await Linking.openSettings();
                } catch (error) {
                  console.error('❌ Failed to open settings:', error);
                }
              }
            }
          ]
        );
      } else {
        console.log('❌ Camera permission denied for KYC, but can ask again');
      }
    } catch (error) {
      console.error('❌ Error requesting camera permission for KYC:', error);
      Alert.alert(
        'Permission Error',
        'Failed to request camera permission. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

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
          
          {/* Show different message if permission was denied and can't ask again */}
          {permission && permission.canAskAgain === false && (
            <Text style={[styles.permissionText, { fontSize: 14, marginBottom: 16, opacity: 0.8 }]}>
              Camera access was denied. Please enable it in your device settings.
            </Text>
          )}
          
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={handleRequestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>
              {permission && permission.canAskAgain === false ? 'Open Settings' : 'Enable Camera'}
            </Text>
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
          quality: 0.4, // 40% quality - optimal for KYC while keeping file size manageable
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

  // App state is now managed globally by AppStateProvider

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
      />

      {/* Blur overlay when app is in background for privacy */}
      {isAppInBackground && (
        <BlurView
          intensity={100}
          tint="dark"
          style={styles.blurOverlay}
        >
          <View style={styles.splashOverlay}>
            <Text style={styles.splashText}>Camera Hidden</Text>
          </View>
        </BlurView>
      )}

      {/* Fallback dark overlay when app is in background */}
      {isAppInBackground && (
        <View style={styles.darkOverlay} />
      )}

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
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFE66C',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  splashText: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamilies.sora.bold,
    color: '#000000',
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 999,
  },
});