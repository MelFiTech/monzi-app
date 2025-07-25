import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView,
  TouchableOpacity,
  Linking,
  Alert,
  BackHandler,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from '@/components/common/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKYCStatus, useKYCStep } from '@/hooks/useKYCService';
import { useAuth } from '@/hooks/useAuthService';
import { useWalletRecovery } from '@/hooks/useWalletService';
import ToastService from '@/services/ToastService';

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  icon: string;
}

const initialSteps: VerificationStep[] = [
  {
    id: 'bvn',
    title: 'Your BVN',
    description: 'Input your BVN to confirm your identity',
    status: 'current',
    icon: '●'
  },
  {
    id: 'biometrics',
    title: 'Biometrics',
    description: 'Scan your face to prove you\'re the real deal.',
    status: 'pending',
    icon: '●'
  },
  {
    id: 'full-access',
    title: 'Full Access',
    description: 'Proceed to get full access',
    status: 'pending',
    icon: '◐'
  }
];

export default function BridgeScreen() {
  const [steps, setSteps] = useState<VerificationStep[]>(initialSteps);
  const [requiresSupport, setRequiresSupport] = useState(false);
  const navigation = useNavigation();

  // React Query hooks
  const { data: kycStatus, isLoading } = useKYCStatus();
  const { currentStep, isKYCComplete, canProceedToSelfie } = useKYCStep();
  const { logout } = useAuth();

  // Set global KYC flow flag when Bridge screen mounts
  useEffect(() => {
    const setKYCFlowFlag = async () => {
      try {
        await AsyncStorage.setItem('is_in_kyc_flow', 'true');
        console.log('🎯 Bridge Screen: Set KYC flow flag to prevent verification modal');
      } catch (error) {
        console.error('Error setting KYC flow flag:', error);
      }
    };
    
    setKYCFlowFlag();
    
    // Clear flag when component unmounts
    return () => {
      const clearKYCFlowFlag = async () => {
        try {
          await AsyncStorage.removeItem('is_in_kyc_flow');
          console.log('🔄 Bridge Screen: Cleared KYC flow flag on unmount');
        } catch (error) {
          console.error('Error clearing KYC flow flag:', error);
        }
      };
      clearKYCFlowFlag();
    };
  }, []);

  // Block hardware back button on Android and disable gestures
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        console.log('🔒 Hardware back button blocked on Bridge screen');
        return true; // Prevent default behavior (going back)
      });

      // Disable swipe gestures using navigation options
      navigation.setOptions({
        gestureEnabled: false,
      });

      console.log('🔒 Swipe gestures disabled for Bridge screen');

      return () => {
        backHandler.remove();
        // Re-enable gestures when leaving screen
        navigation.setOptions({
          gestureEnabled: true,
        });
        console.log('✅ Swipe gestures re-enabled');
      };
    }, [navigation])
  );

  useEffect(() => {
    if (kycStatus) {
      console.log('🔄 Bridge screen updating steps from KYC status:', {
        kycStatus: kycStatus.kycStatus,
        bvnVerified: kycStatus.bvnVerified,
        selfieVerified: kycStatus.selfieVerified,
        isVerified: kycStatus.isVerified,
        canProceedToSelfie,
        isKYCComplete
      });
      updateStepsFromKYCStatus();
    }
  }, [kycStatus]);

  // Check for contact support flag on mount
  useEffect(() => {
    const checkSupportFlag = async () => {
      try {
        const supportFlag = await AsyncStorage.getItem('kyc_requires_support');
        if (supportFlag === 'true') {
          console.log('🚨 Bridge screen detected support flag, showing contact support');
          setRequiresSupport(true);
          // Clear the flag after detecting it
          await AsyncStorage.removeItem('kyc_requires_support');
        }
      } catch (error) {
        console.error('Error checking support flag:', error);
      }
    };

    checkSupportFlag();
  }, []);

  const updateStepsFromKYCStatus = () => {
    if (!kycStatus) return;

    console.log('🔄 Bridge screen updating steps from KYC status:', {
      kycStatus: kycStatus.kycStatus,
      bvnVerified: kycStatus.bvnVerified,
      selfieVerified: kycStatus.selfieVerified,
      isVerified: kycStatus.isVerified,
      canProceedToSelfie,
      isKYCComplete
    });

    const updatedSteps = steps.map(step => {
      if (step.id === 'bvn') {
        const newStatus = kycStatus.bvnVerified ? 'completed' as const : 
                         kycStatus.kycStatus === 'PENDING' || !kycStatus.bvnVerified ? 'current' as const : 'pending' as const;
        console.log('🔄 BVN step update:', { 
          bvnVerified: kycStatus.bvnVerified, 
          kycStatus: kycStatus.kycStatus, 
          newStatus 
        });
        return { 
          ...step, 
          status: newStatus
        };
      }
      if (step.id === 'biometrics') {
        let newStatus: 'completed' | 'current' | 'pending' = 'pending';
        if (kycStatus.selfieVerified && (kycStatus.kycStatus === 'VERIFIED' || kycStatus.kycStatus === 'APPROVED')) {
          newStatus = 'completed';
        } else if (kycStatus.kycStatus === 'REJECTED') {
          newStatus = 'pending'; // Keep it pending, user needs to contact support
        } else if (kycStatus.bvnVerified && !kycStatus.selfieVerified && (kycStatus.kycStatus === 'IN_PROGRESS' || kycStatus.kycStatus === 'UNDER_REVIEW')) {
          newStatus = 'current';
        }
        console.log('🔄 Biometrics step update:', { 
          bvnVerified: kycStatus.bvnVerified, 
          selfieVerified: kycStatus.selfieVerified, 
          kycStatus: kycStatus.kycStatus, 
          newStatus 
        });
        return { ...step, status: newStatus };
      }
      if (step.id === 'full-access') {
        // Full Access step should remain pending - it represents the action user needs to take
        return { 
          ...step, 
          status: 'pending' as const
        };
      }
      return step;
    });
    
    setSteps(updatedSteps);
    
    // Auto-navigate if KYC is complete (only if fully verified/approved)
    if (isKYCComplete && (kycStatus.kycStatus === 'VERIFIED' || kycStatus.kycStatus === 'APPROVED') && kycStatus.isVerified && kycStatus.bvnVerified && kycStatus.selfieVerified) {
      // Don't auto-navigate for APPROVED status, let user click "Get full access"
      if (kycStatus.kycStatus === 'VERIFIED') {
        setTimeout(() => {
          completeVerification();
        }, 1000);
      }
    }
  };

  const handleVerifyBiometrics = () => {
    console.log('🚀 User proceeding to biometrics verification');
    router.push('/(kyc)/biometrics');
  };

  const handleVerifyBVN = () => {
    router.push('/(kyc)/bvn');
  };

  const completeVerification = async () => {
    try {
      // For APPROVED users, proceed directly to home (wallet will be created automatically)
      if ((kycStatus as any)?.kycStatus === 'APPROVED') {
        console.log('🔄 APPROVED user - proceeding to home (wallet will be created automatically)');
        
        // Set verification flags and navigate to home
        await AsyncStorage.setItem('user_verified', 'true');
        await AsyncStorage.setItem('biometrics_completed', 'true');
        
        // Don't try to activate wallet here - let the backend create it automatically
        ToastService.success('Verification complete');
        router.replace('/(tabs)');
      } else {
        // For VERIFIED users, proceed normally
        await AsyncStorage.setItem('user_verified', 'true');
        await AsyncStorage.setItem('biometrics_completed', 'true');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error completing verification:', error);
      router.replace('/(tabs)');
    }
  };

  const getStepStatusColor = (status: string, stepId?: string) => {
    switch (status) {
      case 'completed':
        return '#F5C842'; // Primary color for completed steps
      case 'current':
        return '#FFFFFF';
      case 'pending':
        return 'rgba(255, 255, 255, 0.3)'; // Gray for all pending steps
      default:
        return 'rgba(255, 255, 255, 0.3)';
    }
  };

  const getStepIcon = (step: VerificationStep) => {
    if (step.status === 'completed') {
      return '✓';
    }
    return step.icon;
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

  const handleContactSupport = async () => {
    const message = encodeURIComponent("Hi, I need help with my account verification. My verification was rejected and I need assistance to complete the process.");
    const instagramUrl = `instagram://user?username=monzimoney`;
    const fallbackUrl = `https://www.instagram.com/monzimoney/`;
    
    try {
      const canOpen = await Linking.canOpenURL(instagramUrl);
      if (canOpen) {
        await Linking.openURL(instagramUrl);
      } else {
        // Fallback to web Instagram
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Error opening Instagram:', error);
      Alert.alert(
        'Contact Support',
        'Please reach out to us on Instagram @monzimoney for assistance with your verification.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify your{"\n"}Identity</Text>
        </View>
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <View style={[styles.stepIcon, { backgroundColor: getStepStatusColor(step.status, step.id) }]}>
                  <Text style={[styles.stepIconText, { color: step.status === 'completed' ? '#000000' : step.status === 'current' ? '#000000' : '#FFFFFF' }]}>{getStepIcon(step)}</Text>
                </View>
                {index < steps.length - 1 && (
                  <View style={[styles.connectingLine, { backgroundColor: step.status === 'completed' ? '#F5C842' : 'rgba(255, 255, 255, 0.3)' }]} />
                )}
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  {step.status === 'completed' && (
                    <View style={styles.successBadge}>
                      <Text style={styles.successBadgeText}>Success</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.stepDescription, { color: step.status === 'pending' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.7)' }]}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        {(() => {
          // Priority check: If user requires support (e.g., BVN_ALREADY_EXISTS), show contact support
          if (requiresSupport) {
            console.log('🔄 Bridge button: Contact Support (requires support flag)');
            return (
              <Button
                title="Contact Support"
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleContactSupport}
              />
            );
          } else if (isLoading) {
            console.log('🔄 Bridge button: Loading...');
            return (
              <Button
                title="Loading..."
                variant="primary"
                size="lg"
                fullWidth
                disabled={true}
                onPress={() => {}}
              />
            );
          } else if ((kycStatus as any)?.kycStatus === 'PENDING' || !(kycStatus as any)?.bvnVerified) {
            console.log('🔄 Bridge button: Verify BVN (PENDING or BVN not verified)');
            return (
              <Button
                title="Verify BVN"
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleVerifyBVN}
              />
            );
          } else if ((kycStatus as any)?.kycStatus === 'REJECTED') {
            console.log('🔄 Bridge button: Contact Support (REJECTED)');
            return (
              <Button
                title="Contact Support"
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleContactSupport}
              />
            );
          } else if (kycStatus?.bvnVerified && !kycStatus?.selfieVerified && (kycStatus?.kycStatus === 'IN_PROGRESS' || kycStatus?.kycStatus === 'UNDER_REVIEW' || canProceedToSelfie)) {
            console.log('🔄 Bridge button: Verify Biometrics (BVN verified, selfie needed)', {
              kycStatus: kycStatus?.kycStatus,
              bvnVerified: kycStatus?.bvnVerified,
              selfieVerified: kycStatus?.selfieVerified,
              canProceedToSelfie
            });
            return (
              <Button
                title="Verify Biometrics"
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleVerifyBiometrics}
              />
            );
          } else if ((kycStatus as any)?.kycStatus === 'APPROVED' && (kycStatus as any)?.isVerified && (kycStatus as any)?.bvnVerified && (kycStatus as any)?.selfieVerified) {
            console.log('🔄 Bridge button: Verification Complete (APPROVED)');
            return (
              <Button
                title="Verification Complete"
                variant="primary"
                size="lg"
                fullWidth
                onPress={completeVerification}
              />
            );
          } else if ((kycStatus as any)?.kycStatus === 'VERIFIED' && (kycStatus as any)?.isVerified && (kycStatus as any)?.bvnVerified && (kycStatus as any)?.selfieVerified) {
            console.log('🔄 Bridge button: Verification Complete (VERIFIED)');
            return (
              <Button
                title="Verification Complete"
                variant="primary"
                size="lg"
                fullWidth
                onPress={completeVerification}
              />
            );
          } else {
            console.log('🔄 Bridge button: Continue (fallback)', kycStatus);
            return (
              <Button
                title="Continue"
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => router.push('/(kyc)/bvn')}
              />
            );
          }
        })()}
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: fontSizes['4xl'],
    fontFamily: fontFamilies.clashDisplay.semibold,
    lineHeight: fontSizes['4xl'] * 1.2,
    marginTop: -30,
    color: '#FFFFFF',
  },
  stepsContainer: {
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 22,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconText: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.bold,
  },
  connectingLine: {
    width: 2,
    height: 60,
    marginTop: 8,
  },
  stepContent: {
    flex: 1,
    paddingTop: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.bold,
    marginRight: 12,
    color: '#FFFFFF',
  },
  successBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#F5C842',
  },
  successBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sora.bold,
    color: '#000000',
  },
  stepDescription: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    lineHeight: fontSizes.sm * 1.4,
  },
  footer: {
    paddingHorizontal: 14,
    paddingBottom: 34,
    paddingTop: 20,
  },
}); 