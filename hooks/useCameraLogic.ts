import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Alert, Animated, Image } from 'react-native';
import { CameraView } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ExtractedBankData } from '@/services';
import { useAppState } from '@/providers/AppStateProvider';
import { useHybridVisionExtractBankDataMutation } from '@/hooks';
import { useResolveAccountMutation } from '@/hooks/useAccountService';
import { useWalletRecovery } from '@/hooks/useWalletService';
import { useTransactionsList } from '@/hooks/useTransactionService';
import { useRecordScan } from '@/hooks/useScanTracking';
import { useKYCStatus } from '@/hooks/useKYCService';
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
  const [showPulsatingGlow, setShowPulsatingGlow] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [isInKYCFlow, setIsInKYCFlow] = useState(false);
  
  // Extraction loader state
  const [showExtractionLoader, setShowExtractionLoader] = useState(false);

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
  const recordScanMutation = useRecordScan();

  // App state management for camera privacy
  const { isAppInBackground } = useAppState();

  // KYC status check
  const { data: kycStatus } = useKYCStatus();

  // Helper function to check if user is verified and show verification modal if not
  const checkKYCAndShowModal = () => {
    const isVerified = kycStatus?.isVerified && 
                      kycStatus?.bvnVerified && 
                      kycStatus?.selfieVerified && 
                      (kycStatus?.kycStatus === 'VERIFIED' || kycStatus?.kycStatus === 'APPROVED');
    
    if (!isVerified) {
      console.log('🔒 KYC verification required - showing verification modal');
      setShowVerificationModal(true);
      setIsPendingVerification(kycStatus?.kycStatus === 'UNDER_REVIEW');
      setIsWalletActivationMode(false);
      return false;
    }
    return true;
  };

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
          
          // Clear the flag immediately to prevent it from affecting future sessions
          await AsyncStorage.removeItem('fresh_registration');
          
          // Set state to remember this is a fresh registration
          setIsFreshRegistration(true);
          
          // Show verification modal immediately without waiting for KYC status
          setIsPendingVerification(false);
          setIsWalletActivationMode(false);
          setShowVerificationModal(true);
          
          // Stop pulsating glow when verification modal is shown
          setShowPulsatingGlow(false);
          setAreAllChecksComplete(true);
        } else {
          console.log('👤 Existing user detected - no fresh registration flag');
        }
      } catch (error) {
        console.error('Error checking fresh registration flag:', error);
      }
    };

    checkFreshRegistration();
  }, []);

  // Reset KYC flow flag when screen comes into focus (user returns from KYC)
  useFocusEffect(
    useCallback(() => {
      // Only reset if user is actually in KYC flow and screen gains focus
      // This prevents interference during navigation
      if (isInKYCFlow) {
        const timer = setTimeout(() => {
          console.log('🏠 User returned to home from KYC flow, resetting flag');
          setIsInKYCFlow(false);
        }, 1000); // Longer delay to allow navigation to complete
        
        return () => clearTimeout(timer);
      }
    }, [isInKYCFlow])
  );

  // App state is now managed globally by AppStateProvider

  // Remove the polling effect that was causing infinite loops

  // Handle capture
  const handleCapture = async () => {
    if (isCapturing || isProcessing || showExtractionLoader) return;
    
    // Check KYC verification before allowing capture
    if (!checkKYCAndShowModal()) {
      return;
    }
    
    try {
      setIsCapturing(true);
      setShowInstructions(false);
      console.log('📸 Starting capture...');
      
      if (!cameraRef.current) {
        console.error('❌ Camera ref not available');
        setIsCapturing(false);
        setShowInstructions(true);
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
      
      // Record the scan usage
      try {
        await recordScanMutation.mutateAsync();
        console.log('📊 Scan usage recorded successfully');
      } catch (error) {
        console.error('❌ Failed to record scan usage:', error);
        // Continue with extraction even if scan recording fails
      }
      
      // Clear old data and set captured image URI
      setExtractedData(null);
      setCapturedImageUri(photo.uri);
      setIsCapturing(false);
      setShowExtractionLoader(true);
      
      // Start background processing
      console.log('🎯 Starting FRESH AI extraction - NO CACHED DATA...');
      
      // Set up timeout for extraction process (30 seconds)
      const extractionTimeout = setTimeout(() => {
        console.warn('⏰ Extraction timeout reached');
        setShowExtractionLoader(false);
        setExtractedData(null);
        setShowBankTransferModal(true);
        ToastService.show('Extraction took too long, please fill details manually', 'info');
      }, 30000);
      
      try {
        const result = await extractBankDataMutation.mutateAsync(photo.uri);
        
        // Clear timeout since extraction completed
        clearTimeout(extractionTimeout);
        
        console.log('🎯 AI extraction completed:', result);
        
        // Hide extraction loader
        setShowExtractionLoader(false);
        
        // Set extracted data (or null if no valid data)
        if (result.confidence > 0) {
          setExtractedData(result);
        } else {
          console.warn('⚠️ No valid data extracted from image');
          setExtractedData(null);
        }
        
        // Show bank transfer modal with extracted data or empty state
        setShowBankTransferModal(true);
        
      } catch (error) {
        // Clear timeout on error
        clearTimeout(extractionTimeout);
        
        console.error('❌ Error during extraction:', error);
        
        // Hide extraction loader
        setShowExtractionLoader(false);
        
        // Show modal with empty state for manual entry
        setExtractedData(null);
        setShowBankTransferModal(true);
        
        ToastService.show('Extraction failed, please fill details manually', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error during capture:', error);
      setIsCapturing(false);
      setShowInstructions(true);
      ToastService.show('Failed to capture image', 'error');
    }
  };

  const processImage = async (imageUri: string) => {
    try {
      // Record the scan usage for gallery images too
      try {
        await recordScanMutation.mutateAsync();
        console.log('📊 Gallery scan usage recorded successfully');
      } catch (error) {
        console.error('❌ Failed to record gallery scan usage:', error);
        // Continue with extraction even if scan recording fails
      }
      
      // Clear old data and set captured image URI
      setExtractedData(null);
      setCapturedImageUri(imageUri);
      setShowExtractionLoader(true);
      
      console.log('🎯 Starting FRESH AI extraction from gallery - NO CACHED DATA...');
      
      // Set up timeout for extraction process (30 seconds)
      const extractionTimeout = setTimeout(() => {
        console.warn('⏰ Extraction timeout reached');
        setShowExtractionLoader(false);
        setExtractedData(null);
        setShowBankTransferModal(true);
        ToastService.show('Extraction took too long, please fill details manually', 'info');
      }, 30000);
      
      try {
        const extractedBankData = await extractBankDataMutation.mutateAsync(imageUri);
        
        // Clear timeout since extraction completed
        clearTimeout(extractionTimeout);
        
        console.log('🎯 FRESH AI extraction completed:', extractedBankData);

        // Hide extraction loader
        setShowExtractionLoader(false);
        
        // Set extracted data (or null if no valid data)
        if (extractedBankData.confidence > 0) {
          setExtractedData(extractedBankData);
        } else {
          console.warn('⚠️ No valid data extracted from image');
          setExtractedData(null);
        }
        
        // Show bank transfer modal with extracted data or empty state
        setShowBankTransferModal(true);
        
      } catch (error) {
        // Clear timeout on error
        clearTimeout(extractionTimeout);
        
        console.error('❌ Error during extraction:', error);
        
        // Hide extraction loader
        setShowExtractionLoader(false);
        
        // Show modal with empty state for manual entry
        setExtractedData(null);
        setShowBankTransferModal(true);
        
        ToastService.show('Extraction failed, please fill details manually', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error processing image:', error);
      Alert.alert(
        'Processing Failed', 
        'Unable to extract bank details. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: () => processImage(imageUri) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const toggleFlash = () => {
    // Check KYC verification before allowing flash toggle
    if (!checkKYCAndShowModal()) {
      return;
    }
    
    const modes: FlashMode[] = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
  };

  const toggleCamera = () => {
    setCameraType(prev => prev === 'back' ? 'front' : 'back');
  };

  const handleViewHistory = () => {
    // Check KYC verification before allowing history access
    if (!checkKYCAndShowModal()) {
      return;
    }
    
    setShowTransactionHistory(prev => !prev);
  };

  const openGallery = async () => {
    // Check KYC verification before allowing gallery access
    if (!checkKYCAndShowModal()) {
      return;
    }
    
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
    // Check KYC verification before allowing zoom changes
    if (!checkKYCAndShowModal()) {
      return;
    }
    
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

  const handleBankModalConfirm = (resolvedAccountName?: string, selectedBankName?: string, accountNumber?: string) => {
    console.log('🚀 [CameraLogic] Bank modal confirm triggered:', {
      resolvedAccountName,
      selectedBankName,
      accountNumber,
      extractedData: extractedData ? 'exists' : 'null'
    });

    // Always navigate to transfer screen, even if extractedData is null
    // This allows manual entry in the transfer screen
    const transferParams = {
      bankName: selectedBankName || extractedData?.bankName || '',
      accountNumber: accountNumber || extractedData?.accountNumber || '',
      accountHolderName: resolvedAccountName || extractedData?.accountHolderName || '',
      amount: extractedData?.amount || '',
    };

    console.log('📤 [CameraLogic] Navigating to transfer with params:', {
      ...transferParams,
      accountHolderName: transferParams.accountHolderName ? 'exists' : 'empty'
    });

    router.push({
      pathname: '/transfer',
      params: transferParams
    });
    
    setShowBankTransferModal(false);
    setExtractedData(null);
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
      // IMMEDIATELY close modal and set flags to prevent reappearance
      setShowVerificationModal(false);
      setIsInKYCFlow(true);
      
      // Force immediate state update to prevent modal from showing again
      setShowPulsatingGlow(false);
      setAreAllChecksComplete(true);
      
      // Set global flags to prevent modal from reappearing
      try {
        await AsyncStorage.setItem('is_in_kyc_flow', 'true');
        await AsyncStorage.setItem('modal_dismissed_by_user', 'true');
        console.log('🎯 Set KYC flow and modal dismissed flags');
      } catch (error) {
        console.error('Error setting flags:', error);
      }
      
      if (isPendingVerification) {
        setIsPendingVerification(false);
      } else {
        // Small delay to ensure all state updates are processed before navigation
        setTimeout(() => {
          if (isFreshRegistration) {
            console.log('🆕 Fresh registration user starting KYC - going to BVN');
            setIsFreshRegistration(false);
            router.push('/(kyc)/bvn');
          } else {
            console.log('🔄 Existing user continuing KYC - going to BVN');
            router.push('/(kyc)/bvn');
          }
        }, 100);
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



  // Handle extraction loader completion
  const handleExtractionComplete = (extractedData: ExtractedBankData | null) => {
    console.log('🎯 Extraction loader completed with data:', extractedData);
    setShowExtractionLoader(false);
    setExtractedData(extractedData);
    setShowBankTransferModal(true);
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
    isInKYCFlow,
    isAppInBackground,
    
    // Extraction loader state
    showExtractionLoader,
    capturedImageUri,
    
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
    handleExtractionComplete,
    
    // State setters for backend checks
    setIsFreshRegistration,
    setIsWalletActivationMode,
    setIsPendingVerification,
    setShowVerificationModal,
    setShowSetPinModal,
    setAreAllChecksComplete,
    setShowPulsatingGlow,
    setShowTransactionHistory,
    setIsInKYCFlow,
  };
} 