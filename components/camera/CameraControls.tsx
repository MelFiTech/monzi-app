import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronUp } from 'lucide-react-native';
import { fontFamilies } from '@/constants/fonts';

interface CameraControlsProps {
  zoom: number;
  flashMode: 'off' | 'on' | 'auto';
  isCapturing: boolean;
  isProcessing: boolean;
  onZoomChange: (value: number) => void;
  onToggleFlash: () => void;
  onCapture: () => void;
  onOpenGallery: () => void;
  onViewHistory: () => void;
  isConnectionDisabled?: boolean;
}

export default function CameraControls({
  zoom,
  flashMode,
  isCapturing,
  isProcessing,
  onZoomChange,
  onToggleFlash,
  onCapture,
  onOpenGallery,
  onViewHistory,
  isConnectionDisabled = false,
}: CameraControlsProps) {
  const renderFlashIcon = () => {
    switch (flashMode) {
      case 'on': 
        return <Image source={require('@/assets/icons/home/flash-on.png')} style={{ width: 24, height: 24, tintColor: '#FFFFFF' }} />;
      case 'auto': 
        return <Image source={require('@/assets/icons/home/flash-on.png')} style={{ width: 24, height: 24, tintColor: '#FFFFFF', opacity: 0.5 }} />;
      default: 
        return <Image source={require('@/assets/icons/home/flash-off.png')} style={{ width: 24, height: 24, tintColor: '#FFFFFF' }} />;
    }
  };

  // Check if capture should be disabled
  const isCaptureDisabled = isCapturing || isProcessing || isConnectionDisabled;

  return (
    <>
      {/* Zoom Controls */}
      <View style={styles.zoomContainer}>
        <TouchableOpacity 
          style={[styles.zoomButton, zoom === 0 && styles.zoomButtonActive]} 
          onPress={() => onZoomChange(0)}
        >
          <Text style={[styles.zoomButtonText, zoom === 0 && styles.zoomButtonTextActive]}>1x</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.zoomButton, zoom === 0.5 && styles.zoomButtonActive]} 
          onPress={() => onZoomChange(0.5)}
        >
          <Text style={[styles.zoomButtonText, zoom === 0.5 && styles.zoomButtonTextActive]}>2</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.zoomButton, zoom === 1 && styles.zoomButtonActive]} 
          onPress={() => onZoomChange(1)}
        >
          <Text style={[styles.zoomButtonText, zoom === 1 && styles.zoomButtonTextActive]}>5</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls Container */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.75)']}
        style={styles.bottomContainer}
      >
        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Flash Button */}
          <TouchableOpacity style={styles.flashButton} onPress={onToggleFlash}>
            <View style={styles.controlButton}>
              {renderFlashIcon()}
            </View>
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity 
            onPress={onCapture}
            disabled={isCaptureDisabled}
            style={[
              styles.captureButton, 
              { 
                opacity: isCaptureDisabled ? 0.3 : 1,
                borderColor: isConnectionDisabled 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(255, 255, 255, 0.2)'
              }
            ]}
          >
            <View style={[
              styles.captureButtonInner,
              {
                backgroundColor: isConnectionDisabled 
                  ? 'rgba(255, 255, 255, 0.3)' 
                  : '#FFFFFF'
              }
            ]}>
              <View style={[
                styles.captureButtonCore,
                {
                  backgroundColor: isConnectionDisabled 
                    ? 'rgba(255, 255, 255, 0.3)' 
                    : '#FFFFFF'
                }
              ]} />
            </View>
          </TouchableOpacity>

          {/* Gallery Button */}
          <TouchableOpacity style={styles.galleryButton} onPress={onOpenGallery}>
            <View style={styles.controlButton}>
              <Image source={require('@/assets/icons/home/gallery.png')} style={styles.actionIcon} />
            </View>
          </TouchableOpacity>
        </View>

        {/* View History */}
        <TouchableOpacity style={styles.viewHistoryButton} onPress={onViewHistory}>
          <View style={styles.viewHistoryContent}>
            <Text style={styles.viewHistoryText}>View history</Text>
            <ChevronUp size={16} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
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