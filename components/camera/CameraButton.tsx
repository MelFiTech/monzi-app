import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Camera } from 'lucide-react-native';

interface CameraButtonProps {
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  variant?: 'capture' | 'switch' | 'flash';
  children?: React.ReactNode;
}

export function CameraButton({
  onPress,
  size = 'medium',
  disabled = false,
  variant = 'capture',
  children,
}: CameraButtonProps) {
  const { colors } = useTheme();

  const getButtonStyles = () => {
    const baseStyle = [styles.button];
    
    // Add size styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.small);
        break;
      case 'large':
        baseStyle.push(styles.large);
        break;
      default:
        baseStyle.push(styles.medium);
    }

    // Add variant styles
    switch (variant) {
      case 'capture':
        baseStyle.push(styles.capture, {
          borderColor: colors.white,
          backgroundColor: disabled ? colors.textTertiary : colors.white,
        });
        break;
      case 'switch':
      case 'flash':
        baseStyle.push(styles.control, {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        });
        break;
    }

    return baseStyle;
  };

  const getInnerButtonStyles = () => {
    if (variant === 'capture') {
      return [
        styles.captureInner,
        {
          backgroundColor: disabled ? colors.textTertiary : colors.primary,
        },
      ];
    }
    return [];
  };

  const renderContent = () => {
    if (variant === 'capture') {
      return <View style={getInnerButtonStyles()} />;
    }
    
    return children || <Camera size={18} color={colors.white} strokeWidth={2} />;
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  // Size styles
  small: {
    width: 50,
    height: 50,
  },
  medium: {
    width: 70,
    height: 70,
  },
  large: {
    width: 90,
    height: 90,
  },
  // Variant styles
  capture: {
    borderWidth: 4,
  },
  captureInner: {
    borderRadius: 50,
    width: '70%',
    height: '70%',
  },
  control: {
    width: 44,
    height: 44,
  },
});

export default CameraButton; 