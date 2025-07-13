import React, { useRef } from 'react';
import { View, StyleSheet, Animated, Image, Text, Dimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import { fontFamilies } from '@/constants/fonts';

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
}: CameraInterfaceProps) {
  return (
    <>
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
}); 