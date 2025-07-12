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
import { BankTransferModal, CircularLoader, VerificationModal, Toast, SetPinModal } from '@/components/common';
import { CaptureAnimation } from '@/components/camera';
import { ExtractedBankData, CacheService, EnhancedExtractedBankData, ProcessingStep } from '@/services';
import { useHybridVisionExtractBankDataMutation, useHybridVisionDataValidation } from '@/hooks';
import { useEnhancedVisionExtractBankData } from '@/hooks/useEnhancedVisionService';
import ToastService from '@/services/ToastService';
import { useResolveAccountMutation } from '@/hooks/useAccountService';
import { useKYCStatus } from '@/hooks/useKYCService';
import { useWalletDetails, useWalletBalance, useWalletRecovery, usePinStatus } from '@/hooks/useWalletService';
import type { KYCStatusResponse } from '@/services/KYCService';
import { 
  ChevronUp,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { WalletService } from '@/services';

const { width, height } = Dimensions.get('window');

type FlashMode = 'off' | 'on' | 'auto';
type CameraType = 'back' | 'front';

export default function CameraScreen() {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  
  // Import authentication hook to check auth state
  const { isAuthenticated, user } = useAuth();

  // Debug authentication state
  useEffect(() => {
    console.log('🔐 Authentication Debug:', {
      isAuthenticated,
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id
    });
  }, [isAuthenticated, user]);

  // KYC Status with comprehensive logging
  const { data: kycStatus, error: kycError, isLoading: kycLoading, isError: kycIsError } = useKYCStatus();
  
  // Debug KYC status fetch
  useEffect(() => {
    console.log('📋 KYC Status Fetch Debug:', {
      isAuthenticated,
      kycStatus,
      kycError: kycError?.message,
      kycLoading,
      kycIsError,
      hasKycData: !!kycStatus
    });
  }, [isAuthenticated, kycStatus, kycError, kycLoading, kycIsError]);

  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [zoom, setZoom] = useState(0);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [isWalletActivationMode, setIsWalletActivationMode] = useState(false);
  const [isFreshRegistration, setIsFreshRegistration] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedBankData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string>('');
  const [showCaptureAnimation, setShowCaptureAnimation] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const flashAnimation = useRef(new Animated.Value(0)).current;
  const instructionAnimation = useRef(new Animated.Value(1)).current;
  const zoomAnimation = useRef(new Animated.Value(1)).current;

  // React Query hooks - Enhanced Vision Service
  const enhancedExtractBankDataMutation = useEnhancedVisionExtractBankData({
    onProgress: (step: ProcessingStep) => {
      console.log('🔄 Processing step:', step);
      setProcessingSteps(prev => [...prev, step]);
    },
    onQuickPreview: (preview) => {
      console.log('👀 Quick preview:', preview);
      // Could show instant feedback here
    }
  });
  const resolveAccountMutation = useResolveAccountMutation();
  const { validateExtraction, formatAmount } = useHybridVisionDataValidation();
  const { data: walletDetails, error: walletDetailsError, isLoading: walletDetailsLoading, isError: walletDetailsIsError } = useWalletDetails();
  const { data: walletBalance, error: walletBalanceError, isLoading: walletBalanceLoading, isError: walletBalanceIsError } = useWalletBalance();
  const { data: pinStatus } = usePinStatus();
  const walletRecoveryMutation = useWalletRecovery();

  // Debug wallet endpoints
  useEffect(() => {
    console.log('🔍 Wallet Endpoint Debug:', {
      walletDetails: {
        data: walletDetails,
        error: walletDetailsError,
        isLoading: walletDetailsLoading,
        isError: walletDetailsIsError
      },
      walletBalance: {
        data: walletBalance,
        error: walletBalanceError,
        isLoading: walletBalanceLoading,
        isError: walletBalanceIsError
      }
    });

    // WALLET ERROR HANDLER: If wallet errors indicate KYC needed, show verification modal immediately
    const hasKycRequiredError = 
      (walletDetailsError && walletDetailsError.message?.includes('complete KYC verification first')) ||
      (walletBalanceError && walletBalanceError.message?.includes('complete KYC verification first'));

    if (hasKycRequiredError && isAuthenticated && !isFreshRegistration) {
      console.log('🚨 WALLET ERROR: KYC verification required - showing verification modal immediately');
      
      if (!showVerificationModal) {
        console.log('📱 Triggering verification modal due to wallet KYC error');
        setIsWalletActivationMode(false);
        setIsPendingVerification(false);
        setShowVerificationModal(true);
      }
    }
  }, [walletDetails, walletDetailsError, walletDetailsLoading, walletDetailsIsError, walletBalance, walletBalanceError, walletBalanceLoading, walletBalanceIsError, isAuthenticated, isFreshRegistration, showVerificationModal]);

  // COMPREHENSIVE FLOW SUMMARY for debugging
  useEffect(() => {
    console.log('🌊 COMPREHENSIVE FLOW SUMMARY:', {
      // User State
      isAuthenticated,
      hasUser: !!user,
      
      // Registration State
      isFreshRegistration,
      
      // KYC State
      kycStatus: kycStatus ? (kycStatus as any)?.kycStatus : 'NO_DATA',
      kycLoading,
      kycIsError,
      kycError: kycError?.message,
      
      // Modal State
      showVerificationModal,
      isPendingVerification,
      isWalletActivationMode,
      
      // Flow Logic
      'Flow Decision': 
        isFreshRegistration ? 'FRESH_REGISTRATION_PRIORITY' :
        kycIsError ? 'KYC_API_ERROR_FALLBACK' :
        kycLoading ? 'WAITING_FOR_KYC' :
        !kycStatus ? 'NO_KYC_DATA_FALLBACK' :
        (kycStatus as any)?.kycStatus === 'APPROVED' ? 'APPROVED_USER' :
        (kycStatus as any)?.kycStatus === 'VERIFIED' ? 'VERIFIED_USER' :
        (kycStatus as any)?.kycStatus === 'IN_PROGRESS' ? 'IN_PROGRESS_USER' :
        (kycStatus as any)?.kycStatus === 'UNDER_REVIEW' ? 'UNDER_REVIEW_USER' :
        (kycStatus as any)?.kycStatus === 'REJECTED' ? 'REJECTED_USER' :
        (kycStatus as any)?.kycStatus === 'PENDING' ? 'PENDING_USER' :
        'UNKNOWN_STATUS'
    });
  }, [
    isAuthenticated, user, isFreshRegistration, 
    kycStatus, kycLoading, kycIsError, kycError,
    showVerificationModal, isPendingVerification, isWalletActivationMode
  ]);

  // Debug wallet access conditions
  useEffect(() => {
    if (kycStatus) {
      const statusData = kycStatus as any;
      const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                             statusData?.isVerified && 
                             statusData?.bvnVerified && 
                             statusData?.selfieVerified;
      
      console.log('🔐 Wallet Access Debug:', {
        kycStatus: statusData?.kycStatus,
        isVerified: statusData?.isVerified,
        bvnVerified: statusData?.bvnVerified,
        selfieVerified: statusData?.selfieVerified,
        isFullyVerified,
        shouldHaveWalletAccess: isFullyVerified
      });
    }
  }, [kycStatus]);

  // Manual wallet endpoint test function
  const testWalletEndpoints = async () => {
    try {
      console.log('🧪 Testing wallet endpoints manually...');
      
      // First, test API configuration
      const { Config } = await import('@/constants/config');
      const baseUrl = Config.API.getBaseUrl();
      console.log('🔧 API Configuration Test:', {
        baseUrl,
        environment: Config.getCurrentEnvironment(),
        isDevelopment: Config.isDevelopment()
      });
      
      // Test authentication token
      console.log('🔑 Testing authentication token...');
      try {
        const { AuthStorageService } = await import('@/services');
        const authStorageService = AuthStorageService.getInstance();
        const authData = await authStorageService.getAuthData();
        console.log('🔑 Auth Token Test:', {
          hasAuthData: !!authData,
          hasAccessToken: !!authData?.accessToken,
          tokenLength: authData?.accessToken ? authData.accessToken.length : 0,
          tokenPrefix: authData?.accessToken ? authData.accessToken.substring(0, 10) + '...' : 'none'
        });
      } catch (authError) {
        console.error('🔑 Auth token check failed:', authError);
      }
      
      // Test basic connectivity to API
      console.log('🌐 Testing API connectivity...');
      try {
        const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
        console.log('🌐 API Health Check:', {
          status: response.status,
          ok: response.ok,
          url: response.url
        });
      } catch (connectivityError) {
        console.warn('🌐 API Health Check failed (might be normal):', connectivityError);
      }
      
      const walletService = WalletService.getInstance();
      
      // Test wallet details
      console.log('🧪 Testing wallet details endpoint...');
      console.log('📡 Making request to:', `${baseUrl}/wallet/details`);
      try {
        const details = await walletService.getWalletDetails();
        console.log('✅ Wallet details success:', details);
      } catch (detailsError: any) {
        console.error('❌ Wallet details error:', {
          message: detailsError.message,
          statusCode: detailsError.statusCode,
          error: detailsError.error,
          details: detailsError.details
        });
      }
      
      // Test wallet balance
      console.log('🧪 Testing wallet balance endpoint...');
      console.log('📡 Making request to:', `${baseUrl}/wallet/balance`);
      try {
        const balance = await walletService.getWalletBalance();
        console.log('✅ Wallet balance success:', balance);
      } catch (balanceError: any) {
        console.error('❌ Wallet balance error:', {
          message: balanceError.message,
          statusCode: balanceError.statusCode,
          error: balanceError.error,
          details: balanceError.details
        });
      }
      
    } catch (error) {
      console.error('🧪 Manual test error:', error);
    }
  };

  // Test wallet endpoints when user is authenticated and KYC is loaded
  useEffect(() => {
    if (kycStatus && (kycStatus as any)?.kycStatus) {
      console.log('🧪 Triggering wallet endpoint test for authenticated user...');
      testWalletEndpoints();
    }
  }, [kycStatus]);

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

  // PRIORITY 0: Check for fresh registration and show modal immediately
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

    // Check for fresh registration flag immediately
    checkFreshRegistration();
  }, []);

  // PRIORITY 1: KYC Status Fallback - Always hit endpoint for all users
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, skipping KYC status fallback');
      return;
    }

    // This useEffect serves as a fallback system for all users
    console.log('🔄 KYC Status Fallback System Active - will use KYC data when available');
    
    if (kycStatus) {
      const statusData = kycStatus as any;
      console.log('📋 KYC Status Fallback Data:', {
        kycStatus: statusData?.kycStatus,
        isVerified: statusData?.isVerified,
        bvnVerified: statusData?.bvnVerified,
        selfieVerified: statusData?.selfieVerified,
        isFreshRegistration
      });

      // Skip processing if fresh registration is already handling this
      if (isFreshRegistration) {
        console.log('🆕 Fresh registration already handled, KYC status will be used for future sessions');
        return;
      }

      // Process KYC status for login users or when fresh registration is not active
      const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                             statusData?.isVerified && 
                             statusData?.bvnVerified && 
                             statusData?.selfieVerified;

      if (!isFullyVerified) {
        // User needs to complete or continue KYC verification
        console.log('⚠️ User not fully verified based on KYC status, checking if modal should be shown');
        
        // Check if modal is already shown
        if (!showVerificationModal) {
          console.log('📱 Showing KYC verification modal based on status');
          setIsWalletActivationMode(false);
          setIsPendingVerification(statusData?.kycStatus === 'UNDER_REVIEW');
          setShowVerificationModal(true);
        }
      } else {
        console.log('✅ User is fully verified based on KYC status');
      }
    } else if (kycIsError && !kycLoading && !isFreshRegistration) {
      // KYC API failed - show verification modal as fallback for non-fresh registration users
      console.error('❌ KYC Status API failed, using fallback for login users:', kycError?.message);
      
      if (!showVerificationModal) {
        console.log('🆘 Showing verification modal as KYC API fallback');
        setIsWalletActivationMode(false);
        setIsPendingVerification(false);
        setShowVerificationModal(true);
      }
    } else if (!kycLoading && !kycStatus && !kycIsError && !isFreshRegistration) {
      // KYC returned no data - treat as unverified user
      console.log('⚠️ No KYC data returned, treating as unverified user');
      
      if (!showVerificationModal) {
        console.log('📱 Showing verification modal for no KYC data scenario');
        setIsWalletActivationMode(false);
        setIsPendingVerification(false);
        setShowVerificationModal(true);
      }
    }
  }, [isAuthenticated, kycStatus, kycIsError, kycLoading, kycError, isFreshRegistration, showVerificationModal]);

  useEffect(() => {
    // LEGACY: AsyncStorage-based verification status (for special cases like pending modal)
    // This is supplementary to the main KYC API fallback system above
    
    // For APPROVED users, never show verification modals
    if (kycStatus && (kycStatus as any)?.kycStatus === 'APPROVED') {
      console.log('✅ User is APPROVED, no verification modals needed');
      return;
    }

    // Only check legacy verification flags for non-APPROVED users
    if (kycStatus && (kycStatus as any)?.kycStatus !== 'APPROVED') {
      const checkLegacyVerificationStatus = async () => {
        try {
          const showPendingModal = await AsyncStorage.getItem('show_pending_modal');
          const userVerified = await AsyncStorage.getItem('user_verified');
          
          // Skip this logic if user just completed fresh registration (handled separately)
          if (isFreshRegistration) {
            console.log('🆕 Skipping legacy verification logic - fresh registration handled separately');
            return;
          }
          
          // Check for special pending modal flag (set by KYC processes)
          if (showPendingModal === 'true') {
            console.log('🔔 Legacy pending modal flag detected');
            // Clear the flag and show pending modal
            await AsyncStorage.removeItem('show_pending_modal');
            setIsPendingVerification(true);
            setShowVerificationModal(true);
          } else if (userVerified !== 'true' && !showVerificationModal && !kycStatus) {
            // Only show if no modal is shown and no KYC data (extreme fallback)
            console.log('🆘 Legacy fallback: No KYC data and user not marked verified');
            const timer = setTimeout(() => {
              setIsPendingVerification(false);
              setShowVerificationModal(true);
            }, 1000); // Longer delay to let KYC API finish
            return () => clearTimeout(timer);
          }
        } catch (error) {
          console.error('Error checking legacy verification status:', error);
        }
      };

      checkLegacyVerificationStatus();
    }
  }, [kycStatus, isFreshRegistration, showVerificationModal]);

  // PRIORITY 2: Check wallet availability first for all verified users
  useEffect(() => {
    if (kycStatus) {
      const statusData = kycStatus as any;
      
      // Check if user is fully verified (VERIFIED or APPROVED)
      const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                             statusData?.isVerified && 
                             statusData?.bvnVerified && 
                             statusData?.selfieVerified;
      
      if (isFullyVerified) {
        console.log('🔍 User is fully verified, checking wallet availability first...');
        
        // Check if user just completed fresh registration - skip wallet check if so
        if (isFreshRegistration) {
          console.log('🆕 Skipping wallet availability check - fresh registration modal has priority');
          return;
        }
        
        // STEP 1: Check if wallet data is available (successful responses)
        const hasWalletData = walletDetails && walletBalance;
        
        // STEP 2: Check if wallet data is missing (error responses indicate no wallet)
        const hasWalletDetailsError = walletDetailsError && 
          (walletDetailsError.message?.includes('not found') || 
           walletDetailsError.message?.includes('Wallet not found') ||
           walletDetailsError.statusCode === 404);
           
        const hasWalletBalanceError = walletBalanceError && 
          (walletBalanceError.message?.includes('not found') || 
           walletBalanceError.message?.includes('Wallet not found') ||
           walletBalanceError.statusCode === 404);

        console.log('💳 Wallet availability check for verified user:', {
          kycStatus: statusData?.kycStatus,
          hasWalletDetails: !!walletDetails,
          hasWalletBalance: !!walletBalance,
          hasWalletData,
          walletDetailsError: walletDetailsError?.message,
          walletBalanceError: walletBalanceError?.message,
          hasWalletDetailsError,
          hasWalletBalanceError
        });

        // STEP 3: Decision logic
        if (hasWalletData) {
          // User has wallet data - NO activation modal needed
          console.log('✅ User has wallet data, no activation needed');
          setIsWalletActivationMode(false);
          setShowVerificationModal(false);
        } else if (hasWalletDetailsError || hasWalletBalanceError) {
          // User missing wallet data - show activation modal
          console.log('⚠️ User missing wallet data, showing activation modal');
          setIsWalletActivationMode(true);
          setIsPendingVerification(false);
          setShowVerificationModal(true);
        } else if (!walletDetails && !walletBalance && !walletDetailsError && !walletBalanceError) {
          // Still loading wallet data - wait
          console.log('⏳ Wallet data still loading, waiting...');
        }
      } else {
        // User not fully verified - show verification modal (not activation)
        console.log('⚠️ User not fully verified, showing verification modal');
        
        // Check if fresh registration modal is already shown
        if (isFreshRegistration) {
          console.log('🆕 Skipping unverified modal - fresh registration modal has priority');
          return;
        }
        
        setIsWalletActivationMode(false);
        setIsPendingVerification(false);
        setShowVerificationModal(true);
      }
    }
  }, [kycStatus, walletDetails, walletBalance, walletDetailsError, walletBalanceError, isFreshRegistration]);

  // PRIORITY 3: Check PIN status for users with wallet access
  useEffect(() => {
    if (kycStatus && walletDetails && walletBalance && pinStatus) {
      const statusData = kycStatus as any;
      
      // Check if user is fully verified and has wallet access
      const isFullyVerified = ((statusData?.kycStatus === 'VERIFIED') || (statusData?.kycStatus === 'APPROVED')) && 
                             statusData?.isVerified && 
                             statusData?.bvnVerified && 
                             statusData?.selfieVerified;

      const hasWalletAccess = walletDetails && walletBalance;

      if (isFullyVerified && hasWalletAccess) {
        console.log('🔑 Checking PIN status for user with wallet access:', {
          hasPinSet: pinStatus.hasPinSet,
          walletExists: pinStatus.walletExists,
          message: pinStatus.message
        });

        // If wallet exists but no PIN is set, show SetPinModal
        if (pinStatus.walletExists && !pinStatus.hasPinSet) {
          console.log('⚠️ Wallet exists but no PIN set, showing PIN setup modal');
          setShowSetPinModal(true);
        } else if (pinStatus.hasPinSet) {
          console.log('✅ PIN is already set, user can proceed with transfers');
        } else if (!pinStatus.walletExists) {
          console.log('❌ Wallet does not exist, should show wallet activation');
          // This case should be handled by the wallet check above
        }
      }
    }
  }, [kycStatus, walletDetails, walletBalance, pinStatus]);

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
        // Show gamified capture animation
        setCapturedImageUri(photo.uri);
        setShowCaptureAnimation(true);
        setProcessingSteps([]); // Reset processing steps
        
        // Start processing in background
        await processImage(photo.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      setShowCaptureAnimation(false);
      setCapturedImageUri('');
      setProcessingSteps([]);
    } finally {
      setIsCapturing(false);
    }
  };

  const processImage = async (imageUri: string) => {
    try {
      // Only show old loader if not using gamified animation
      if (!showCaptureAnimation) {
        setIsProcessing(true);
      }

      // Use Enhanced React Query mutation to extract bank data with OCR + compression
      const enhancedData = await enhancedExtractBankDataMutation.mutateAsync(imageUri);
      
      console.log('🎯 Enhanced extraction completed:', enhancedData);

      // Convert enhanced data to compatible format
      const compatibleData: ExtractedBankData = {
        accountNumber: enhancedData.accountNumber,
        bankName: enhancedData.bankName,
        amount: enhancedData.amount || '',
        accountHolderName: '', // Will be resolved in modal
        confidence: enhancedData.confidence,
        extractedFields: {
          accountNumber: !!enhancedData.accountNumber,
          bankName: !!enhancedData.bankName,
          amount: !!enhancedData.amount,
          accountHolderName: false, // Will be resolved later
        }
      };

      // Cache the extracted data (without account resolution)
      await CacheService.cacheData(compatibleData);
      setExtractedData(compatibleData);
      setShowBankModal(true);
      
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
      // Only hide old loader if not using gamified animation
      if (!showCaptureAnimation) {
        setIsProcessing(false);
      }
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

  const handleBankModalConfirm = (resolvedAccountName?: string) => {
    if (extractedData) {
      // Navigate to transfer screen with extracted data and resolved account name
      router.push({
        pathname: '/transfer',
        params: {
          bankName: extractedData.bankName,
          accountNumber: extractedData.accountNumber,
          accountHolderName: resolvedAccountName || extractedData.accountHolderName || '',
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

  const handleVerifyID = async () => {
    if (isWalletActivationMode) {
      // Handle wallet activation for APPROVED users
      console.log('🔄 Activating wallet for APPROVED user...');
      
      try {
        await walletRecoveryMutation.mutateAsync();
        console.log('✅ Wallet activation successful');
        ToastService.success('Wallet activated');
        
        // Close modal and reset state
        setShowVerificationModal(false);
        setIsWalletActivationMode(false);
      } catch (error: any) {
        console.error('❌ Wallet activation failed:', error);
        
        // Keep modal open but show error
        if (error.message?.includes('complete KYC verification first') || error.statusCode === 400) {
          ToastService.error('Contact support');
        } else {
          ToastService.error('Activation failed');
        }
      }
    } else {
      // Normal verification flow
      setShowVerificationModal(false);
      
      if (isPendingVerification) {
        // Just close the modal for pending verification
        setIsPendingVerification(false);
      } else {
        // Check if this is a fresh registration (new users always start with BVN)
        if (isFreshRegistration) {
          console.log('🆕 Fresh registration user starting KYC - going to BVN');
          setIsFreshRegistration(false); // Clear the flag since user is starting KYC
          router.push('/(kyc)/bvn');
          return;
        }
        
        // Navigate based on current KYC status for existing users
        if ((kycStatus as any)?.kycStatus === 'IN_PROGRESS' && (kycStatus as any)?.bvnVerified && !(kycStatus as any)?.selfieVerified) {
          // BVN verified, need selfie - go to bridge
          router.push('/(kyc)/bridge');
        } else if ((kycStatus as any)?.kycStatus === 'UNDER_REVIEW' || (kycStatus as any)?.kycStatus === 'REJECTED') {
          // Under review or rejected - go to bridge
          router.push('/(kyc)/bridge');
        } else {
          // Need to start with BVN (fallback for unknown status)
          router.push('/(kyc)/bvn');
        }
      }
    }
  };

  const handleSetPinModalClose = () => {
    setShowSetPinModal(false);
  };

  const handleSetPinSuccess = () => {
    console.log('✅ PIN setup completed successfully');
    setShowSetPinModal(false);
    
    // Pin Set Successfully toast will be shown by the SetPinModal component
  };

  const handleCaptureAnimationComplete = () => {
    console.log('🎬 Capture animation completed');
    setShowCaptureAnimation(false);
    setCapturedImageUri('');
    setProcessingSteps([]);
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
          <Text style={[styles.permissionText, { color: '#FFFFFF' }]}>
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
          <Text style={[styles.permissionText, typography.heading.h4, { color: '#FFFFFF' }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionSubtext, typography.body.medium, { color: colors.textSecondary }]}>
            We need camera access to scan account details
          </Text>
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, typography.button.medium, { color: '#FFFFFF' }]}>
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
          <Text style={[styles.loaderText, { color: '#FFFFFF' }]}>
            {enhancedExtractBankDataMutation.isPending ? 'Extracting data...' : 
             resolveAccountMutation.isPending ? 'Verifying account...' : 
             'Processing...'}
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

      {/* Gamified Capture Animation */}
      <CaptureAnimation
        visible={showCaptureAnimation}
        capturedImageUri={capturedImageUri}
        processingSteps={processingSteps}
        onAnimationComplete={handleCaptureAnimationComplete}
      />

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
        title={
          isWalletActivationMode ? "Activate Your\nWallet" :
          isPendingVerification ? "Verification\nPending.." : 
          "Complete your\nverification"
        }
        description={
          isWalletActivationMode ? "Your verification is complete! Activate your wallet to start using all features and transfer money." :
          isPendingVerification ? "Verification should take 2 - 4 hrs\n\nYou will be notified" : 
          (kycStatus as any)?.bvnVerified && !(kycStatus as any)?.selfieVerified ? 
            "Complete your biometric verification to access all features" :
            "Complete account verification with your BVN and selfie to start using Monzi"
        }
        buttonText={
          isWalletActivationMode ? 
            (walletRecoveryMutation.isPending ? "Activating wallet" : "Activate Wallet") :
          isPendingVerification ? "Got it" : 
          "Continue Verification"
        }
        loading={isWalletActivationMode ? walletRecoveryMutation.isPending : false}
        icon={require('@/assets/images/verify/shield.png')}
      />

      {/* Set PIN Modal */}
      <SetPinModal
        visible={showSetPinModal}
        onClose={handleSetPinModalClose}
        onSuccess={handleSetPinSuccess}
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