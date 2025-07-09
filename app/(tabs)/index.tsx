import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/providers/ThemeProvider';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { typography, fontFamilies, fontSizes } from '@/constants/fonts';
import CameraButton from '@/components/camera/CameraButton';
import { CameraHeader } from '@/components/layout';
import { BankTransferModal, CircularLoader, VerificationModal, Toast } from '@/components/common';
import { ExtractedBankData, CacheService } from '@/services';
import { useExtractBankDataMutation, useDataValidation } from '@/hooks';
import { 
  ChevronUp,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

type FlashMode = 'off' | 'on' | 'auto';
type CameraType = 'back' | 'front';

export default function CameraScreen() {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [zoom, setZoom] = useState(0);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedBankData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const flashAnimation = useRef(new Animated.Value(0)).current;
  const instructionAnimation = useRef(new Animated.Value(1)).current;
  const zoomAnimation = useRef(new Animated.Value(1)).current;

  // React Query hooks
  const extractBankDataMutation = useExtractBankDataMutation();
  const { validateExtraction, formatAmount } = useDataValidation();

  useEffect(() => {
    // Request camera permissions on component mount
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    // Hide instructions after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(instructionAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowInstructions(false));
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check for pending verification modal or show initial verification modal
    const checkVerificationStatus = async () => {
      try {
        const showPendingModal = await AsyncStorage.getItem('show_pending_modal');
        const userVerified = await AsyncStorage.getItem('user_verified');
        
        if (showPendingModal === 'true') {
          // Clear the flag and show pending modal
          await AsyncStorage.removeItem('show_pending_modal');
          setIsPendingVerification(true);
          setShowVerificationModal(true);
        } else if (userVerified !== 'true') {
          // Show initial verification modal only if user is not verified
          const timer = setTimeout(() => {
            setIsPendingVerification(false);
            setShowVerificationModal(true);
          }, 500);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        // Fallback to showing initial modal
        const timer = setTimeout(() => {
          setIsPendingVerification(false);
          setShowVerificationModal(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    };

    checkVerificationStatus();
  }, []);

  const showFlashAnimation = () => {
    Animated.sequence([
      Animated.timing(flashAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(flashAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      showFlashAnimation();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        await processImage(photo.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const processImage = async (imageUri: string) => {
    try {
      setIsProcessing(true);

      // Use React Query mutation to extract bank data
      const extractedBankData = await extractBankDataMutation.mutateAsync(imageUri);
      
      // Check cache if we have basic account info
      if (extractedBankData.accountNumber && extractedBankData.bankName) {
        console.log('🔍 Checking cache for:', extractedBankData.accountNumber, extractedBankData.bankName);
        const cachedData = await CacheService.getCachedData(
          extractedBankData.accountNumber, 
          extractedBankData.bankName
        );
        
        if (cachedData) {
          console.log('🚀 Using cached data!');
          setExtractedData(cachedData);
          setShowBankModal(true);
          setIsProcessing(false);
          return;
        }
      }
      
      console.log('🎯 Extracted data:', extractedBankData);

      if (validateExtraction(extractedBankData)) {
        // Successfully extracted data - cache it and show modal
        await CacheService.cacheData(extractedBankData);
        setExtractedData(extractedBankData);
        setShowBankModal(true);
      } else {
        // Low confidence but still show modal with available data
        // Only cache if we have minimum required data
        if (CacheService.canCache(extractedBankData)) {
          await CacheService.cacheData(extractedBankData);
        }
        setExtractedData(extractedBankData);
        setShowBankModal(true);
      }
    } catch (error) {
      console.error('❌ Error processing image:', error);
      Alert.alert(
        'Processing Failed', 
        'Unable to extract bank details. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: () => handleCapture() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessImage = (imageUri: string) => {
    processImage(imageUri);
  };

  const toggleFlash = () => {
    const modes: FlashMode[] = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
  };

  const toggleCamera = () => {
    setCameraType(prev => prev === 'back' ? 'front' : 'back');
  };

  const handleViewHistory = () => {
    Alert.alert('View History', 'Transaction history feature coming soon!');
  };

  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening gallery:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const handleZoomChange = (value: number) => {
    // Visual zoom animation
    Animated.sequence([
      Animated.timing(zoomAnimation, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(zoomAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
    
    setZoom(value);
  };

  const handleBankModalClose = () => {
    setShowBankModal(false);
    setExtractedData(null);
  };

  const handleBankModalConfirm = () => {
    if (extractedData) {
      // Navigate to transfer screen with extracted data
      router.push({
        pathname: '/transfer',
        params: {
          bankName: extractedData.bankName,
          accountNumber: extractedData.accountNumber,
          accountHolderName: extractedData.accountHolderName,
          amount: extractedData.amount || '',
        }
      });
      setShowBankModal(false);
      setExtractedData(null);
    }
  };

  const handleBankModalSuccess = () => {
    Alert.alert('Success!', 'Transfer completed successfully!');
    setShowBankModal(false);
    setExtractedData(null);
  };

  const handleVerificationModalClose = () => {
    setShowVerificationModal(false);
  };

  const handleVerifyID = () => {
    setShowVerificationModal(false);
    
    if (isPendingVerification) {
      // Just close the modal for pending verification
      setIsPendingVerification(false);
    } else {
      // Navigate to BVN flow first for initial verification
      router.push('/(kyc)/bvn');
    }
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on': 
        return <Image source={require('@/assets/icons/home/flash-on.png')} style={styles.actionIcon} />;
      case 'auto': 
        return <Image source={require('@/assets/icons/home/flash-on.png')} style={[styles.actionIcon, { opacity: 0.5 }]} />;
      default: 
        return <Image source={require('@/assets/icons/home/flash-off.png')} style={styles.actionIcon} />;
    }
  };

  // Handle permissions
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        <CameraHeader />
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, { color: colors.white }]}>
            Requesting camera permissions...
          </Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        <CameraHeader />
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, typography.heading.h4, { color: colors.white }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionSubtext, typography.body.medium, { color: colors.textSecondary }]}>
            We need camera access to scan account details
          </Text>
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, typography.button.medium, { color: colors.white }]}>
              Grant Camera Access
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <CameraHeader />
      
      {/* Camera View */}
      <Animated.View style={[styles.camera, { transform: [{ scale: zoomAnimation }] }]}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={cameraType}
          flash={flashMode}
          mode="picture"
          zoom={zoom}
        />
      </Animated.View>

      {/* Flash Animation Overlay */}
      <Animated.View 
        style={[
          styles.flashOverlay, 
          { 
            opacity: flashAnimation,
            backgroundColor: 'white',
          }
        ]} 
        pointerEvents="none"
      />

      {/* Dark Overlay with Circular Cutout */}
      <View style={styles.overlay}>
        {/* Circular Viewfinder */}
        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinder}>
            <View style={styles.viewfinderRing} />
            <View style={styles.viewfinderRing2} />
            <View style={styles.viewfinderRing3} />
          </View>
        </View>
      </View>

      {/* Instructions in Center - Show conditionally */}
      {showInstructions && !isProcessing && (
        <Animated.View 
          style={[styles.centerInstructionsContainer, { opacity: instructionAnimation }]}
        >
          <View style={styles.instructionsBubble}>
            <Image 
              source={require('@/assets/icons/home/scan.png')}
              style={styles.scanIcon}
            />
            <Text style={styles.centerInstructionsText}>
              Ensure account and{'\n'}bank name are clear.
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Processing Loader */}
      {isProcessing && (
        <View style={styles.loaderContainer}>
          <CircularLoader size={60} color="#F5C842" />
          <Text style={[styles.loaderText, { color: colors.white }]}>
            Processing image...
          </Text>
        </View>
      )}

      {/* Zoom Controls */}
      <View style={styles.zoomContainer}>
        <TouchableOpacity 
          style={[styles.zoomButton, zoom === 0 && styles.zoomButtonActive]} 
          onPress={() => handleZoomChange(0)}
        >
          <Text style={[styles.zoomButtonText, zoom === 0 && styles.zoomButtonTextActive]}>1x</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.zoomButton, zoom === 0.5 && styles.zoomButtonActive]} 
          onPress={() => handleZoomChange(0.5)}
        >
          <Text style={[styles.zoomButtonText, zoom === 0.5 && styles.zoomButtonTextActive]}>2</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.zoomButton, zoom === 1 && styles.zoomButtonActive]} 
          onPress={() => handleZoomChange(1)}
        >
          <Text style={[styles.zoomButtonText, zoom === 1 && styles.zoomButtonTextActive]}>5</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls Container */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.95)']}
        style={styles.bottomContainer}
      >
        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Flash Button */}
          <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
            <View style={styles.controlButton}>
              {getFlashIcon()}
            </View>
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity 
            onPress={handleCapture}
            disabled={isCapturing || isProcessing}
            style={[styles.captureButton, { opacity: (isCapturing || isProcessing) ? 0.5 : 1 }]}
          >
            <View style={styles.captureButtonInner}>
              <View style={styles.captureButtonCore} />
            </View>
          </TouchableOpacity>

          {/* Gallery Button */}
          <TouchableOpacity style={styles.galleryButton} onPress={openGallery}>
            <View style={styles.controlButton}>
              <Image source={require('@/assets/icons/home/gallery.png')} style={styles.actionIcon} />
            </View>
          </TouchableOpacity>
        </View>

        {/* View History */}
        <TouchableOpacity style={styles.viewHistoryButton} onPress={handleViewHistory}>
          <View style={styles.viewHistoryContent}>
            <Text style={styles.viewHistoryText}>View history</Text>
            <ChevronUp size={16} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Bank Transfer Modal */}
      {extractedData && (
        <BankTransferModal
          visible={showBankModal}
          onClose={handleBankModalClose}
          onConfirmTransfer={handleBankModalConfirm}
          onSuccess={handleBankModalSuccess}
          amount={extractedData.amount || '0'}
          nairaAmount={`N${formatAmount(extractedData.amount || '0')}`}
          extractedData={extractedData}
        />
      )}

      {/* Verification Modal */}
      <VerificationModal
        visible={showVerificationModal}
        onClose={handleVerificationModalClose}
        onVerifyID={handleVerifyID}
        title={isPendingVerification ? "Verification\nPending.." : "Finish your\naccount setup"}
        description={isPendingVerification ? "Verification should take 2 - 4 hrs\n\nYou will be notified" : "Complete account verification with a selfie and your BVN to start using \n Monzi"}
        buttonText={isPendingVerification ? "Got it" : "Verify ID"}
        icon={require('@/assets/images/verify/shield.png')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: 200,
    left: 0,
    right: 0,
    bottom: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderRing: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: (width * 0.85) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  viewfinderRing2: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewfinderRing3: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: (width * 0.95) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  centerInstructionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  instructionsBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    maxWidth: width * 0.8,
  },
  scanIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
    tintColor: '#FFFFFF',
  },
  centerInstructionsText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: fontFamilies.sora.semiBold,
    textAlign: 'center',
    lineHeight: 20,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
  },
  zoomContainer: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 40,
    zIndex: 200,
    marginBottom: 30,
  },
  zoomButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: fontFamilies.sora.medium,
  },
  zoomButtonTextActive: {
    color: '#FFFFFF',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 190,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingVertical: 20,
  },
  flashButton: {
    padding: 8,
  },
  galleryButton: {
    padding: 8,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.21)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0)',
  },
  actionIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
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
  viewHistoryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  viewHistoryContent: {
    alignItems: 'center',
  },
  viewHistoryText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: fontFamilies.sora.medium,
    marginBottom: 6,
  },
});