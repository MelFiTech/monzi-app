import React from 'react';
import { View, StyleSheet, Text, ImageBackground } from 'react-native';
import { fontFamilies } from '@/constants/fonts';
import CircularLoader from '@/components/common/CircularLoader';

interface ExtractionLoaderProps {
  visible: boolean;
  imageUri: string;
  onComplete?: (extractedData: any) => void;
}

export default function ExtractionLoader({
  visible,
  imageUri,
  onComplete
}: ExtractionLoaderProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: imageUri }}
        style={styles.imageBackground}
        resizeMode="cover"
      >
        {/* Semi-transparent dark overlay */}
        <View style={styles.overlay} />
        
        {/* Loading indicator and text at bottom center */}
        <View style={styles.loadingContainer}>
          <CircularLoader 
            size={40}
            strokeWidth={3}
            color="#FFFFFF"
            backgroundColor="rgba(255, 255, 255, 0.2)"
          />
          <Text style={styles.loadingText}>Extracting...</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.73)',
    pointerEvents: 'none',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 10,
  },
});