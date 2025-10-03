import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Image, Text, Dimensions, AppState } from 'react-native';
import { CameraView } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { fontFamilies } from '@/constants/fonts';
import { SuggestionStrip } from '@/components/common';
import { PaymentSuggestion } from '@/services/LocationService';

const { width } = Dimensions.get('window');

interface CameraInterfaceProps {
  cameraRef: React.RefObject<CameraView | null>;
  cameraType: 'front' | 'back';
  flashMode: 'off' | 'on' | 'auto';
  zoom: number;
  zoomAnimation: Animated.Value;
  showInstructions: boolean;
  instructionAnimation: Animated.Value;
  isProcessing: boolean;
  dimViewfinderRings?: boolean;
  isAppInBackground?: boolean;
  // Suggestion strip props
  suggestions?: PaymentSuggestion[];
  onSuggestionPress?: (suggestion: PaymentSuggestion) => void;
  showSuggestions?: boolean;
  onCloseSuggestions?: () => void;
}

export default function CameraInterface({
  cameraRef,
  cameraType,
  flashMode,
  zoom,
  zoomAnimation,
  showInstructions,
  instructionAnimation,
  isProcessing,
  dimViewfinderRings = false,
  isAppInBackground = false,
  // Suggestion strip props
  suggestions = [],
  onSuggestionPress,
  showSuggestions = false,
  onCloseSuggestions,
}: CameraInterfaceProps) {
  const ringOpacity = dimViewfinderRings ? 0.1 : 1;
  return (
    <>
      {/* Camera View - Always show but blur when app is in background */}
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

      {/* Blur overlay when app is in background for privacy */}
      {isAppInBackground && (
        <BlurView
          intensity={100}
          tint="dark"
          style={styles.blurOverlay}
        >
          <View style={styles.splashOverlay}>
            <Image 
              source={require('@/assets/splash/splash.png')}
              style={styles.splashImage}
              resizeMode="contain"
            />
          </View>
        </BlurView>
      )}

      {/* Fallback dark overlay when app is in background */}
      {isAppInBackground && (
        <View style={styles.darkOverlay} />
      )}

      {/* Dark Overlay with Circular Cutout */}
      <View style={styles.overlay}>
        {/* Circular Viewfinder - Commented out */}
        {/* <View style={styles.viewfinderContainer}>
          { !dimViewfinderRings && (
            <View style={styles.viewfinder}>
              <View style={styles.viewfinderRing} />
              <View style={styles.viewfinderRing2} />
              <View style={styles.viewfinderRing3} />
            </View>
          )}
        </View> */}
      </View>

      {/* Instructions in Center - Show conditionally */}
      {/* {showInstructions && !isProcessing && (
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
      )} */}

      {/* Suggestion Strip - moved up by wrapping in a View with a bottom offset */}
      <View style={styles.suggestionStripWrapper}>
        <SuggestionStrip
          suggestions={suggestions}
          onSuggestionPress={onSuggestionPress || (() => {})}
          onClose={onCloseSuggestions}
          visible={showSuggestions && !isProcessing}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
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
  splashImage: {
    width: '80%',
    height: '80%',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
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
  suggestionStripWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100, // moved up from default (was 140 in SuggestionStrip), adjust as needed
    zIndex: 60, // Higher than HeaderCard to ensure visibility
  },
}); 