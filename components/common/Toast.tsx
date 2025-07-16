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
        return '#FDE46C';
      case 'error':
        return '#FDE46C';
      case 'info':
        return '#FDE46C';
      default:
        return '#FDE46C';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={18} color="#000000" strokeWidth={2} />;
      case 'error':
        return <Text style={styles.errorIcon}>✕</Text>;
      case 'info':
        return <Text style={styles.infoIcon}>i</Text>;
      default:
        return <Check size={18} color="#000000" strokeWidth={2} />;
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
          <Text style={styles.message} numberOfLines={1} ellipsizeMode="tail">{message}</Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
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
    justifyContent: 'center',
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
    color: '#000000',
    lineHeight: 20,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
  },
  infoIcon: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
    fontFamily: fontFamilies.sora.bold,
  },
}); 