import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraHeader } from '@/components/layout';
import { ActionStrip } from './ActionStrip';
import { CameraInterface } from '@/components/camera';

interface HeaderCardProps {
  actions: Array<{
    id: string;
    title: string;
    onPress: () => void;
    active: boolean;
  }>;
  // Camera interface props
  cameraRef: React.RefObject<any>;
  cameraType: 'front' | 'back';
  zoom: number;
  flashMode: 'on' | 'off' | 'auto';
  zoomAnimation: any;
  showInstructions: boolean;
  instructionAnimation: any;
  isCapturing: boolean;
  isProcessing: boolean;
  dimViewfinderRings?: boolean;
  isAppInBackground?: boolean;
  onZoomChange: (zoom: number) => void;
  onToggleFlash: () => void;
  onCapture: () => void;
  onOpenGallery: () => void;
  onViewHistory: () => void;
  isConnectionDisabled: boolean;
  showTransactionHistory: boolean;
  transactions: any[];
  onTransactionPress: (transaction: any) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  hasMoreData: boolean;
  onRequestStatement: () => void;
}

export const HeaderCard: React.FC<HeaderCardProps> = ({
  actions,
  // Camera interface props
  cameraRef,
  cameraType,
  zoom,
  flashMode,
  zoomAnimation,
  showInstructions,
  instructionAnimation,
  isCapturing,
  isProcessing,
  dimViewfinderRings,
  isAppInBackground,
  onZoomChange,
  onToggleFlash,
  onCapture,
  onOpenGallery,
  onViewHistory,
  isConnectionDisabled,
  showTransactionHistory,
  transactions,
  onTransactionPress,
  loading,
  refreshing,
  onRefresh,
  onEndReached,
  hasMoreData,
  onRequestStatement,
}) => {
  return (
    <View style={styles.headerCard}>
      {/* Camera Interface - Full screen camera view */}
             <CameraInterface
               cameraRef={cameraRef}
               cameraType={cameraType}
               zoom={zoom}
               flashMode={flashMode}
               zoomAnimation={zoomAnimation}
               showInstructions={showInstructions}
               instructionAnimation={instructionAnimation}
               isProcessing={isProcessing}
               dimViewfinderRings={dimViewfinderRings}
               isAppInBackground={isAppInBackground}
             />

      {/* Camera Header Overlay */}
      <View style={styles.headerOverlay}>
        <CameraHeader />
        
        {/* Action Strip - Hide when transaction history is open */}
        {!showTransactionHistory && (
          <View style={styles.actionStrip}>
            <ActionStrip actions={actions} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: '#000000',
    zIndex: 30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden', // Restore to ensure border radius is visible
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    paddingTop: 50, // Account for status bar
  },

  actionStrip: {
    position: 'absolute',
    bottom: 40, // Move further down to ensure it's well outside HeaderCard bounds
    right: -10, // Position on the right side
    zIndex: 60, // Higher z-index to ensure visibility above other elements
    paddingVertical: 10,
    alignItems: 'center', // Center the action strip content
    justifyContent: 'center', // Center the action strip content
  },
});
