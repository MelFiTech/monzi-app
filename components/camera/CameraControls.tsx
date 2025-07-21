import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { fontFamilies } from '@/constants/fonts';
import TransactionList from '@/components/common/TransactionList';
import { Transaction } from '@/components/common/TransactionListItem';
import { Button } from '@/components/common';
import { useScanStatusMessage, useRemainingFreeScans } from '@/hooks/useScanTracking';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  showTransactionHistory?: boolean;
  transactions?: Transaction[];
  onTransactionPress?: (transaction: Transaction) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasMoreData?: boolean;
  onRequestStatement?: () => void;
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
  showTransactionHistory = false,
  transactions = [],
  onTransactionPress,
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  hasMoreData = false,
  onRequestStatement,
}: CameraControlsProps) {
  // Get scan status message and remaining free scans
  const { data: scanStatusMessage, isLoading: scanStatusLoading } = useScanStatusMessage();
  const { data: remainingFreeScans } = useRemainingFreeScans();
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Handle animation when showTransactionHistory changes
  useEffect(() => {
    if (showTransactionHistory) {
      // Slide up animation
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [showTransactionHistory]);

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
  const isCaptureDisabled = isCapturing || isProcessing || isConnectionDisabled || showTransactionHistory;

  // Limit to first 6 recent transactions
  const recentTransactions = transactions.slice(0, 6);

  return (
    <>
      {/* Dark Overlay for Transaction History */}
      <Animated.View
        style={[
          styles.darkOverlay,
          {
            opacity: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.6],
            }),
          }
        ]}
        pointerEvents={showTransactionHistory ? 'auto' : 'none'}
      />

      {/* Bottom Controls Container */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.75)']}
        style={[styles.bottomContainer, showTransactionHistory && styles.bottomContainerPushedUp]}
      >
        {/* Zoom Controls */}
        <View style={styles.zoomContainer}>
          <TouchableOpacity
            style={[styles.zoomButton, zoom === 0.1 && styles.zoomButtonActive]}
            onPress={() => onZoomChange(0.1)}
            disabled={isConnectionDisabled || showTransactionHistory}
          >
            <Text style={[styles.zoomButtonText, zoom === 0.1 && styles.zoomButtonTextActive]}>
              0.9x
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomButton, zoom === 0.2 && styles.zoomButtonActive]}
            onPress={() => onZoomChange(0.2)}
            disabled={isConnectionDisabled || showTransactionHistory}
          >
            <Text style={[styles.zoomButtonText, zoom === 0.2 && styles.zoomButtonTextActive]}>
              1x
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomButton, zoom === 0.3 && styles.zoomButtonActive]}
            onPress={() => onZoomChange(0.3)}
            disabled={isConnectionDisabled || showTransactionHistory}
          >
            <Text style={[styles.zoomButtonText, zoom === 0.3 && styles.zoomButtonTextActive]}>
              1.1x
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.bottomControls, { opacity: (isConnectionDisabled || showTransactionHistory) ? 0.3 : 1 }]}>
          {/* Flash Button */}
          <TouchableOpacity
            style={styles.flashButton}
            onPress={onToggleFlash}
            disabled={isConnectionDisabled || showTransactionHistory}
          >
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
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={onOpenGallery}
            disabled={isConnectionDisabled || showTransactionHistory}
          >
            <View style={styles.controlButton}>
              <Image source={require('@/assets/icons/home/gallery.png')} style={styles.actionIcon} />
            </View>
          </TouchableOpacity>
        </View>

        {/* View History */}
        <TouchableOpacity
          style={styles.viewHistoryButton}
          onPress={onViewHistory}
          activeOpacity={0.7}
        >
          <View style={styles.viewHistoryContent}>
            <Text style={styles.viewHistoryText}>
              {showTransactionHistory ? 'Close history' : 'View history'}
            </Text>
            {showTransactionHistory ? (
              <ChevronDown size={16} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
            ) : (
              <ChevronUp size={16} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
            )}
          </View>
        </TouchableOpacity>

        {/* Animated Transaction History - Under View History Button */}
        <Animated.View style={[
          styles.transactionHistoryContainer,
          {
            height: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, SCREEN_HEIGHT * 0.60],
            }),
            opacity: slideAnim,
          }
        ]}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0.35, 0.75)']}
            style={styles.transactionHistoryGradient}
          >
            <View style={styles.transactionListContainer}>
              <TransactionList
                transactions={recentTransactions}
                onTransactionPress={onTransactionPress}
                loading={loading}
                refreshing={false}
                onRefresh={undefined}
                onEndReached={undefined}
                hasMoreData={false}
                scrollEnabled={false}
              />
            </View>

            <TouchableOpacity
              style={styles.requestStatementButton}
              onPress={onRequestStatement}
            >
              <Text style={styles.requestStatementText}>
                Request Statement
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgb(0, 0, 0)',
  },
  zoomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 40,
    marginBottom: 10,
  },
  zoomButton: {
    padding: 10,
    borderRadius: 33,
    width: 53,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  zoomButtonText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: fontFamilies.sora.semiBold,
  },
  zoomButtonTextActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 190,
  },
  bottomContainerPushedUp: {
    bottom: 0,
    paddingTop: 20,
    paddingBottom: 0,
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
    paddingVertical: 15,
    paddingHorizontal: 20,
    minHeight: 44, // Minimum touch target size
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
  transactionHistoryContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    marginTop: -20, // Changed from 10 to -20 to move transaction list up
    marginBottom: 20,
  },
  transactionHistoryGradient: {
    flex: 1,
    padding: 15,
  },
  transactionListContainer: {
    flex: 1,
    marginBottom: 10,
  },
  requestStatementButton: {
    width: 194,
    height: 52,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 15,
    marginTop: 15,
  },
  requestStatementText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: fontFamilies.sora.semiBold,
  },
}); 