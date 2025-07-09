import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function AuthButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = true,
}: AuthButtonProps) {
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

    // Add width style
    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }

    // Add variant styles
    switch (variant) {
      case 'primary':
        baseStyle.push({
          backgroundColor: disabled || loading ? colors.textTertiary : colors.primary,
        });
        break;
      case 'secondary':
        baseStyle.push({
          backgroundColor: disabled || loading ? colors.textTertiary : colors.surface,
        });
        break;
      case 'outline':
        baseStyle.push({
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: disabled || loading ? colors.textTertiary : colors.primary,
        });
        break;
    }

    return baseStyle;
  };

  const getTextStyles = () => {
    const baseStyle = [styles.text];

    // Add size text styles from typography
    switch (size) {
      case 'small':
        baseStyle.push(typography.button.small);
        break;
      case 'large':
        baseStyle.push(typography.button.large);
        break;
      default:
        baseStyle.push(typography.button.medium);
    }

    // Add variant text styles
    switch (variant) {
      case 'primary':
        baseStyle.push({
          color: disabled || loading ? colors.white : colors.white,
        });
        break;
      case 'secondary':
        baseStyle.push({
          color: disabled || loading ? colors.textTertiary : colors.text,
        });
        break;
      case 'outline':
        baseStyle.push({
          color: disabled || loading ? colors.textTertiary : colors.primary,
        });
        break;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <Text style={getTextStyles()}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 62,
  },
  fullWidth: {
    width: '100%',
  },
  // Size styles
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});

export default AuthButton; 