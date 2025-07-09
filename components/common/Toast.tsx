import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Colors from '@/constants/colors';
import { BlurView } from 'expo-blur';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide?: () => void;
}

const { width } = Dimensions.get('window');

export default function Toast({ 
  visible, 
  message, 
  type = 'success', 
  duration = 3000,
  onHide 
}: ToastProps) {
  const slideAnimation = useRef(new Animated.Value(-100)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.spring(slideAnimation, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(0, 0, 0, 0.7)'; // 70% transparent black
      case 'error':
        return 'rgba(0, 0, 0, 0.7)';
      case 'info':
        return 'rgba(0, 0, 0, 0.7)';
      default:
        return 'rgba(0, 0, 0, 0.7)';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={18} color="#FFFFFF" strokeWidth={2} />;
      case 'error':
        return <Text style={styles.errorIcon}>✕</Text>;
      case 'info':
        return <Text style={styles.infoIcon}>i</Text>;
      default:
        return <Check size={18} color="#FFFFFF" strokeWidth={2} />;
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnimation }],
          opacity: opacityAnimation,
        },
      ]}
    >
      <BlurView intensity={20} tint="dark" style={[styles.blurContainer, { backgroundColor: getBackgroundColor() }]}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 64,
    overflow: 'hidden',
  },
  blurContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  errorIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  infoIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: fontFamilies.sora.bold,
  },
}); 