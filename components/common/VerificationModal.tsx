import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/components/common/useColorScheme';
import Colors from '@/constants/colors';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from '@/components/common/Button';

interface VerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerifyID: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
  loading?: boolean;
  icon?: any;
}

export default function VerificationModal({ 
  visible, 
  onClose, 
  onVerifyID, 
  title = "Finish your\naccount setup",
  description = "Complete account verification with a selfie and your BVN to start using \n Monzi",
  buttonText = "Verify ID",
  loading = false,
  icon = require('@/assets/images/verify/shield.png')
}: VerificationModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const [slideAnim] = useState(new Animated.Value(0));

  // Slide animation effect
  useEffect(() => {
    if (visible) {
      // Reset and animate in
      slideAnim.setValue(300); // Start from bottom (300px down)
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleOverlayPress = () => {
    // Do nothing - modal is persistent and cannot be closed by tapping outside
  };

  const handleModalPress = (event: any) => {
    // Prevent closing when tapping inside the modal content
    event.stopPropagation();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing with back button
    >
      <TouchableOpacity 
        style={[
          styles.overlay,
          { backgroundColor: 'rgba(0, 0, 0, 0.6)' }
        ]} 
        activeOpacity={1} 
        onPress={handleOverlayPress}
      >
        <BlurView intensity={8} style={styles.blurView}>
          <View style={styles.modalContainer}>
            <Animated.View
              style={{
                transform: [{ translateY: slideAnim }]
              }}
            >
              <TouchableOpacity 
                style={[styles.modalContent, { backgroundColor: '#000000' }]}
                activeOpacity={1}
                onPress={handleModalPress}
              >
                {/* Top Indicator - Non-interactive */}
                <View
                  style={[
                    styles.topIndicator,
                    { backgroundColor: '#333333' }
                  ]}
                />

                {/* Title */}
                <Text style={[styles.title, { color: '#FFFFFF' }]}>
                  {title}
                </Text>

                {/* Shield Icon */}
                <View style={styles.iconContainer}>
                  <Image 
                    source={icon} 
                    style={styles.shieldImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Description */}
                <Text style={[styles.description, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                  {description}
                </Text>

                {/* Verify ID Button */}
                <View style={styles.buttonContainer}>
                  <Button
                    title={buttonText}
                    onPress={onVerifyID}
                    loading={loading}
                    style={{
                      backgroundColor: '#FFE66C'
                    }}
                    textStyle={{
                      color: '#000000',
                      fontSize: 16,
                      fontFamily: fontFamilies.sora.semiBold,
                      lineHeight: 24,
                    }}
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(44, 44, 44, 0.74)',
  },
  blurView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 50,
    minHeight: '50%',
    alignItems: 'center',
  },
  topIndicator: {
    width: 56,
    height: 6,
    borderRadius: 42,
    alignSelf: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  shieldImage: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: fontSizes['4xl'],
    fontFamily: fontFamilies.clashDisplay.bold,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  description: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: -24,
  },
}); 