import { useState, useRef, useEffect } from 'react';
import { Alert, Animated, Image } from 'react-native';
import { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ExtractedBankData, CacheService } from '@/services';
import { useHybridVisionExtractBankDataMutation } from '@/hooks';
import { useResolveAccountMutation } from '@/hooks/useAccountService';
import { useWalletRecovery } from '@/hooks/useWalletService';
import { useTransactionsList } from '@/hooks/useTransactionService';
import { Transaction } from '@/components/common';
import ToastService from '@/services/ToastService';

type FlashMode = 'off' | 'on' | 'auto';
type CameraType = 'back' | 'front';

export function useCameraLogic() {
  // UI State
  const [zoom, setZoom] = useState(0);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [showBankTransferModal, setShowBankTransferModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedBankData | null>(null);
  const [verifiedAccountData, setVerifiedAccountData] = useState<any>(null);
  const [isFreshRegistration, setIsFreshRegistration] = useState(false);
  const [isWalletActivationMode, setIsWalletActivationMode] = useState(false);
  const [areAllChecksComplete, setAreAllChecksComplete] = useState(false);
  const [showPulsatingGlow, setShowPulsatingGlow] = useState(true);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  // Refs and Animations
  const cameraRef = useRef<CameraView>(null);
  const flashAnimation = useRef(new Animated.Value(0)).current;
  const instructionAnimation = useRef(new Animated.Value(1)).current;
  const zoomAnimation = useRef(new Animated.Value(1)).current;

  // React Query hooks
  const extractBankDataMutation = useHybridVisionExtractBankDataMutation();
  const resolveAccountMutation = useResolveAccountMutation();
  const walletRecoveryMutation = useWalletRecovery();
  const transactionsData = useTransactionsList();

  // Hide instructions after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(instructionAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowInstructions(false));
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Check for fresh registration
  useEffect(() => {
    const checkFreshRegistration = async () => {
      try {
        const isFreshRegistration = await AsyncStorage.getItem('fresh_registration');
        
        if (isFreshRegistration === 'true') {
          console.log('🆕 Fresh registration detected, showing verification modal immediately');
          
          // Clear the flag
          await AsyncStorage.removeItem('fresh_registration');
          
          // Set state to remember this is a fresh registration
          setIsFreshRegistration(true);
          
          // Show verification modal immediately without waiting for KYC status
          setIsPendingVerification(false);
          setIsWalletActivationMode(false);
          setShowVerificationModal(true);
        }
      } catch (error) {
        console.error('Error checking fresh registration flag:', error);
      }
    };

    checkFreshRegistration();
  }, []);

  // Handle capture
  const handleCapture = async () => {
    if (isCapturing || isProcessing) return;
    
    try {
      setIsCapturing(true);
      setShowInstructions(false);
      console.log('📸 Starting capture...');
      
      if (!cameraRef.current) {
        console.error('❌ Camera ref not available');
        return;
      }

      // Flash animation
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

      // Zoom animation
      Animated.sequence([
        Animated.timing(zoomAnimation, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(zoomAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Take picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: true,
      });

      console.log('📷 Picture taken:', photo.uri);
      
      // Store captured image
      setCapturedImageUri(photo.uri);
      setIsCapturing(false);
      setIsProcessing(true);
      
      // Process image with AI
      console.log('🎯 Starting AI extraction...');
      const result = await extractBankDataMutation.mutateAsync(photo.uri);
      
      console.log('🎯 AI extraction completed:', result);
      
      if (result.confidence > 0) {
        setExtractedData(result);
        setShowBankTransferModal(true);
      } else {
        console.warn('⚠️ No valid data extracted from image');
        ToastService.show('No bank details found in image', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error during capture:', error);
      ToastService.show('Failed to capture image', 'error');
    } finally {
      setIsCapturing(false);
      setIsProcessing(false);
      setShowInstructions(true);
    }
  };

  const processImage = async (imageUri: string) => {
    try {
      setIsProcessing(true);

      const extractedBankData = await extractBankDataMutation.mutateAsync(imageUri);
      
      console.log('🎯 AI extraction completed:', extractedBankData);

      const compatibleData: ExtractedBankData = extractedBankData;

      await CacheService.cacheData(compatibleData);
      setExtractedData(compatibleData);
      setShowBankTransferModal(true);
      
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
    setShowTransactionHistory(prev => !prev);
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
    setShowBankTransferModal(false);
    setExtractedData(null);
  };

  const handleBankModalConfirm = (resolvedAccountName?: string) => {
    if (extractedData) {
      router.push({
        pathname: '/transfer',
        params: {
          bankName: extractedData.bankName,
          accountNumber: extractedData.accountNumber,
          accountHolderName: resolvedAccountName || extractedData.accountHolderName || '',
          amount: extractedData.amount || '',
        }
      });
      setShowBankTransferModal(false);
      setExtractedData(null);
    }
  };

  const handleBankModalSuccess = () => {
    Alert.alert('Success!', 'Transfer completed successfully!');
    setShowBankTransferModal(false);
    setExtractedData(null);
  };

  const handleVerificationModalClose = () => {
    setShowVerificationModal(false);
  };

  const handleVerifyID = async () => {
    if (isWalletActivationMode) {
      console.log('🔄 Activating wallet for VERIFIED user...');
      
      try {
        await walletRecoveryMutation.mutateAsync();
        console.log('✅ Wallet activation successful');
        ToastService.success('Wallet activated');
        
        setShowVerificationModal(false);
        setIsWalletActivationMode(false);
      } catch (error: any) {
        console.error('❌ Wallet activation failed:', error);
        
        if (error.message?.includes('complete KYC verification first') || error.statusCode === 400) {
          ToastService.error('Contact support');
        } else {
          ToastService.error('Activation failed');
        }
      }
    } else {
      setShowVerificationModal(false);
      
      if (isPendingVerification) {
        setIsPendingVerification(false);
      } else {
        if (isFreshRegistration) {
          console.log('🆕 Fresh registration user starting KYC - going to BVN');
          setIsFreshRegistration(false);
          router.push('/(kyc)/bvn');
          return;
        }
        
        router.push('/(kyc)/bvn');
      }
    }
  };

  const handleSetPinModalClose = () => {
    console.log('🔒 PIN modal closed by user');
    setShowSetPinModal(false);
  };

  const handleSetPinSuccess = () => {
    console.log('✅ PIN setup completed successfully');
    setShowSetPinModal(false);
  };



  return {
    // State
    zoom,
    flashMode,
    cameraType,
    showBankTransferModal,
    isCapturing,
    isProcessing,
    showInstructions,
    showVerificationModal,
    showSetPinModal,
    isPendingVerification,
    extractedData,
    isFreshRegistration,
    isWalletActivationMode,
    areAllChecksComplete,
    showPulsatingGlow,
    showTransactionHistory,
    
    // Transaction data
    transactionsData,
    
    // Refs
    cameraRef,
    flashAnimation,
    instructionAnimation,
    zoomAnimation,
    
    // Mutations
    walletRecoveryMutation,
    
    // Handlers
    handleCapture,
    toggleFlash,
    toggleCamera,
    handleViewHistory,
    openGallery,
    handleZoomChange,
    handleBankModalClose,
    handleBankModalConfirm,
    handleBankModalSuccess,
    handleVerificationModalClose,
    handleVerifyID,
    handleSetPinModalClose,
    handleSetPinSuccess,
    
    // State setters for backend checks
    setIsFreshRegistration,
    setIsWalletActivationMode,
    setIsPendingVerification,
    setShowVerificationModal,
    setShowSetPinModal,
    setAreAllChecksComplete,
    setShowPulsatingGlow,
    setShowTransactionHistory,
  };
} 