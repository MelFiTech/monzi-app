import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  Animated, 
  Dimensions, 
  StyleSheet 
} from 'react-native';
import { fontFamilies } from '@/constants/fonts';
import { ProcessingStep } from '@/services/EnhancedVisionService';

const { width, height } = Dimensions.get('window');

interface CaptureAnimationProps {
  visible: boolean;
  capturedImageUri?: string;
  processingSteps: ProcessingStep[];
  onAnimationComplete?: () => void;
}

export default function CaptureAnimation({
  visible,
  capturedImageUri,
  processingSteps,
  onAnimationComplete
}: CaptureAnimationProps) {
  const [currentStep, setCurrentStep] = useState<ProcessingStep | null>(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.1)).current;
  const thumbnailScale = useRef(new Animated.Value(1)).current;
  const thumbnailPosition = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(0)).current;
  
  // Track processing steps
  useEffect(() => {
    if (processingSteps.length > 0) {
      const latestStep = processingSteps[processingSteps.length - 1];
      setCurrentStep(latestStep);
      
      // Animate step appearance
      Animated.sequence([
        Animated.timing(stepOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(stepOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Update progress bar
      const completedSteps = processingSteps.filter(step => step.status === 'completed').length;
      const totalExpectedSteps = 4; // Compression, Local OCR, API, Complete
      const progress = Math.min(completedSteps / totalExpectedSteps, 1);
      
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [processingSteps]);

  // Initial animation when visible
  useEffect(() => {
    if (visible && capturedImageUri) {
      // Step 1: Fade in overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Step 2: Scale up thumbnail with bounce
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Step 3: Move thumbnail to final position after a delay
      setTimeout(() => {
        Animated.timing(thumbnailPosition, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 800);

    } else if (!visible) {
      // Reset animations when hidden
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.1);
      thumbnailScale.setValue(1);
      thumbnailPosition.setValue(0);
      progressAnim.setValue(0);
      stepOpacity.setValue(0);
    }
  }, [visible, capturedImageUri]);

  // Check if processing is complete
  useEffect(() => {
    const hasCompletedStep = processingSteps.some(step => 
      step.status === 'completed' && 
      (step.step === 'API Extraction' || step.step === 'Local OCR Processing')
    );
    
    if (hasCompletedStep && onAnimationComplete) {
      // Delay before calling completion to show success state
      setTimeout(() => {
        onAnimationComplete();
      }, 1500);
    }
  }, [processingSteps, onAnimationComplete]);

  if (!visible) return null;

  const thumbnailTransform = [
    { scale: scaleAnim },
    { 
      translateY: thumbnailPosition.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -100], // Move up 100 pixels
      })
    },
    { 
      translateX: thumbnailPosition.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0], // Keep centered horizontally
      })
    }
  ];

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'starting':
      default:
        return '⏳';
    }
  };

  const getStepColor = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return '#10B981'; // Green
      case 'failed':
        return '#EF4444'; // Red
      case 'starting':
      default:
        return '#F59E0B'; // Yellow
    }
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Captured Image Thumbnail */}
      {capturedImageUri && (
        <Animated.View 
          style={[
            styles.thumbnailContainer,
            { transform: thumbnailTransform }
          ]}
        >
          <View style={styles.thumbnailFrame}>
            <Image 
              source={{ uri: capturedImageUri }} 
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.thumbnailOverlay}>
              <Text style={styles.capturedText}>📸</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Processing Progress */}
      <View style={styles.progressContainer}>
        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]} 
          />
        </View>

        {/* Current Step Display */}
        {currentStep && (
          <Animated.View style={[styles.stepContainer, { opacity: stepOpacity }]}>
            <View style={styles.stepContent}>
              <Text style={styles.stepIcon}>{getStepIcon(currentStep)}</Text>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{currentStep.step}</Text>
                <Text style={[styles.stepStatus, { color: getStepColor(currentStep) }]}>
                  {currentStep.status === 'starting' && 'Processing...'}
                  {currentStep.status === 'completed' && `Completed in ${currentStep.duration || 0}ms`}
                  {currentStep.status === 'failed' && 'Failed - trying alternative'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Processing Title */}
        <Text style={styles.processingTitle}>
          Extracting bank details...
        </Text>
        <Text style={styles.processingSubtitle}>
          Using AI + Local OCR for best results
        </Text>
      </View>

      {/* Animated Background Elements */}
      <View style={styles.backgroundElements}>
        {[...Array(6)].map((_, index) => (
          <AnimatedCircle key={index} delay={index * 200} />
        ))}
      </View>
    </Animated.View>
  );
}

// Animated circle component for background
function AnimatedCircle({ delay }: { delay: number }) {
  const animValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    
    setTimeout(animate, delay);
  }, [animValue, delay]);

  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1.2, 0.5],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.1, 0.3, 0.1],
  });

  return (
    <Animated.View
      style={[
        styles.animatedCircle,
        {
          transform: [{ scale }],
          opacity,
        }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  thumbnailContainer: {
    position: 'absolute',
    top: height * 0.4,
    alignItems: 'center',
  },
  thumbnailFrame: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#F5C842',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedText: {
    fontSize: 24,
  },
  progressContainer: {
    position: 'absolute',
    bottom: height * 0.25,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F5C842',
    borderRadius: 2,
  },
  stepContainer: {
    width: '100%',
    marginBottom: 16,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepStatus: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
  },
  processingTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  animatedCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5C842',
    top: Math.random() * height,
    left: Math.random() * width,
  },
}); 