import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from '@/components/common/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { useKYCStatus, useKYCStep } from '@/hooks/useKYCService';

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
    description: 'Get your $ virtual card, stash account no',
    status: 'pending',
    icon: '◐'
  }
];

export default function BridgeScreen() {
  const [steps, setSteps] = useState<VerificationStep[]>(initialSteps);

  // React Query hooks
  const { data: kycStatus, isLoading } = useKYCStatus();
  const { currentStep, isKYCComplete, canProceedToSelfie } = useKYCStep();

  useEffect(() => {
    if (kycStatus) {
      updateStepsFromKYCStatus();
    }
  }, [kycStatus]);

  const updateStepsFromKYCStatus = () => {
    if (!kycStatus) return;

    const updatedSteps = steps.map(step => {
      if (step.id === 'bvn') {
        return { 
          ...step, 
          status: kycStatus.bvnVerified ? 'completed' as const : 
                  kycStatus.kycStatus === 'PENDING' ? 'current' as const : 'pending' as const
        };
      }
      if (step.id === 'biometrics') {
        if (kycStatus.selfieVerified && kycStatus.kycStatus === 'VERIFIED') {
          return { ...step, status: 'completed' as const };
        } else if (kycStatus.kycStatus === 'UNDER_REVIEW') {
          return { ...step, status: 'pending' as const };
        } else if (kycStatus.bvnVerified && kycStatus.kycStatus === 'IN_PROGRESS') {
          return { ...step, status: 'current' as const };
        } else {
          return { ...step, status: 'pending' as const };
        }
      }
      if (step.id === 'full-access') {
        return { 
          ...step, 
          status: kycStatus.kycStatus === 'VERIFIED' ? 'completed' as const : 'pending' as const
        };
      }
      return step;
    });
    
    setSteps(updatedSteps);
    
    // Auto-navigate if KYC is complete
    if (isKYCComplete) {
      setTimeout(() => {
        completeVerification();
      }, 1000);
    }
  };

  const handleVerifyBiometrics = () => {
    router.push('/(kyc)/biometrics');
  };

  const handleVerifyBVN = () => {
    router.push('/(kyc)/bvn');
  };

  const completeVerification = async () => {
    try {
      await AsyncStorage.setItem('user_verified', 'true');
      await AsyncStorage.setItem('biometrics_completed', 'true');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing verification:', error);
      router.replace('/(tabs)');
    }
  };

  const getStepStatusColor = (status: string, stepId?: string) => {
    switch (status) {
      case 'completed':
        return Colors.dark.primary; // Primary color for completed steps
      case 'current':
        return Colors.dark.white;
      case 'pending':
        return Colors.dark.textTertiary; // Gray for all pending steps
      default:
        return Colors.dark.textTertiary;
    }
  };

  const getStepIcon = (step: VerificationStep) => {
    if (step.status === 'completed') {
      return '✓';
    }
    return step.icon;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}>
      <AuthHeader />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors.dark.white }]}>Verify your{"\n"}Identity</Text>
        </View>
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <View style={[styles.stepIcon, { backgroundColor: getStepStatusColor(step.status, step.id) }]}>
                  <Text style={[styles.stepIconText, { color: step.status === 'completed' ? Colors.dark.black : step.status === 'current' ? Colors.dark.black : Colors.dark.white }]}>{getStepIcon(step)}</Text>
                </View>
                {index < steps.length - 1 && (
                  <View style={[styles.connectingLine, { backgroundColor: step.status === 'completed' ? Colors.dark.primary : Colors.dark.textTertiary }]} />
                )}
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepTitle, { color: Colors.dark.white }]}>{step.title}</Text>
                  {step.status === 'completed' && (
                    <View style={[styles.successBadge, { backgroundColor: Colors.dark.primary }]}>
                      <Text style={[styles.successBadgeText, { color: Colors.dark.black }]}>Success</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.stepDescription, { color: step.status === 'pending' ? Colors.dark.textTertiary : Colors.dark.textSecondary }]}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        {isLoading ? (
          <Button
            title="Loading..."
            variant="primary"
            size="lg"
            style={{ backgroundColor: Colors.dark.primary, width: '100%' }}
            textStyle={{ color: Colors.dark.black }}
            disabled={true}
            onPress={() => {}}
          />
        ) : kycStatus?.kycStatus === 'PENDING' ? (
          <Button
            title="Verify BVN"
            variant="primary"
            size="lg"
            style={{ backgroundColor: Colors.dark.primary, width: '100%' }}
            textStyle={{ color: Colors.dark.black }}
            onPress={handleVerifyBVN}
          />
        ) : kycStatus?.kycStatus === 'IN_PROGRESS' && canProceedToSelfie ? (
          <Button
            title="Verify Biometrics"
            variant="primary"
            size="lg"
            style={{ backgroundColor: Colors.dark.primary, width: '100%' }}
            textStyle={{ color: Colors.dark.black }}
            onPress={handleVerifyBiometrics}
          />
        ) : kycStatus?.kycStatus === 'UNDER_REVIEW' ? (
          <Button
            title="Notify me when verified"
            variant="primary"
            size="lg"
            style={{ backgroundColor: Colors.dark.primary, width: '100%' }}
            textStyle={{ color: Colors.dark.black }}
            onPress={async () => {
              await AsyncStorage.setItem('show_pending_modal', 'true');
              router.replace('/(tabs)');
            }}
          />
        ) : kycStatus?.kycStatus === 'VERIFIED' ? (
          <Button
            title="Verification Complete"
            variant="primary"
            size="lg"
            style={{ backgroundColor: Colors.dark.primary, width: '100%' }}
            textStyle={{ color: Colors.dark.black }}
            onPress={completeVerification}
          />
        ) : (
          <Button
            title="Continue"
            variant="primary"
            size="lg"
            style={{ backgroundColor: Colors.dark.primary, width: '100%' }}
            textStyle={{ color: Colors.dark.black }}
            onPress={() => router.push('/(kyc)/bvn')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  successBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  successBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sora.bold,
    color: Colors.dark.white,
  },
  stepDescription: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    lineHeight: fontSizes.sm * 1.4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: -14,
    paddingTop: 16,
  },
}); 