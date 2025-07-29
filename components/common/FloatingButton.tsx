import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface FloatingButtonProps {
  icon: any; // Image source or React element
  onPress: () => void;
  style?: any;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'none';
}

export default function FloatingButton({ icon, onPress, style, hapticFeedback = 'light' }: FloatingButtonProps) {
  const triggerHapticFeedback = async () => {
    if (hapticFeedback === 'none') {
      return;
    }

    try {
      switch (hapticFeedback) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      // Silently handle haptic feedback errors
      console.warn('Haptic feedback failed:', error);
    }
  };

  const handlePress = async () => {
    await triggerHapticFeedback();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          position: 'absolute',
          bottom: 50,
          right: 25,
          backgroundColor: 'rgba(0, 0, 0, 0.28)',
          elevation: 9999,
        },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {React.isValidElement(icon) ? icon : <Image source={icon} style={styles.icon} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // backgroundColor and elevation are overridden above
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
}); 