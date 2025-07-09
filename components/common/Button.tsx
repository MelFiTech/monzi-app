import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'error' | 'warning' | 'white';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const { colors } = useTheme();

  const getButtonStyles = (): ViewStyle[] => {
    const baseStyle = [styles.button];
    
    // Add size styles
    switch (size) {
      case 'xs':
        baseStyle.push(styles.xs);
        break;
      case 'sm':
        baseStyle.push(styles.sm);
        break;
      case 'lg':
        baseStyle.push(styles.lg);
        break;
      case 'xl':
        baseStyle.push(styles.xl);
        break;
      default:
        baseStyle.push(styles.md);
    }

    // Add width style
    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }

    // Add variant styles
    const isDisabled = disabled || loading;
    switch (variant) {
      case 'primary':
        baseStyle.push({
          backgroundColor: isDisabled ? '#242424' : '#FFE66C',
          borderRadius: 100,
        });
        break;
      case 'secondary':
        baseStyle.push({
          backgroundColor: isDisabled ? '#242424' : colors.surface,
          borderWidth: 1,
          borderColor: isDisabled ? '#242424' : colors.border,
          borderRadius: 100,
        });
        break;
      case 'outline':
        baseStyle.push({
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDisabled ? '#242424' : '#FFE66C',
          borderRadius: 100,
        });
        break;
      case 'ghost':
        baseStyle.push({
          backgroundColor: 'transparent',
          borderRadius: 100,
        });
        break;
      case 'success':
        baseStyle.push({
          backgroundColor: isDisabled ? '#242424' : colors.success,
          borderRadius: 100,
        });
        break;
      case 'error':
        baseStyle.push({
          backgroundColor: isDisabled ? '#242424' : colors.error,
          borderRadius: 100,
        });
        break;
      case 'warning':
        baseStyle.push({
          backgroundColor: isDisabled ? '#242424' : colors.warning,
          borderRadius: 100,
        });
        break;
      case 'white':
        baseStyle.push({
          backgroundColor: isDisabled ? '#242424' : colors.white,
          borderRadius: 100,
        });
        break;
    }

    // Add custom style
    if (style) {
      baseStyle.push(style);
    }

    return baseStyle;
  };

  const getTextStyles = (): TextStyle[] => {
    const baseStyle = [styles.text];

    // Add size text styles from typography
    switch (size) {
      case 'xs':
      case 'sm':
        baseStyle.push(typography.button.small);
        break;
      case 'lg':
      case 'xl':
        baseStyle.push(typography.button.large);
        break;
      default:
        baseStyle.push(typography.button.medium);
    }

    // Add variant text styles
    const isDisabled = disabled || loading;
    switch (variant) {
      case 'primary':
      case 'success':
      case 'error':
      case 'warning':
        baseStyle.push({
          color: isDisabled ? '#525252' : '#000000',
        });
        break;
      case 'secondary':
        baseStyle.push({
          color: isDisabled ? '#525252' : '#000000',
        });
        break;
      case 'outline':
      case 'ghost':
        baseStyle.push({
          color: isDisabled ? '#525252' : '#000000',
        });
        break;
      case 'white':
        baseStyle.push({
          color: isDisabled ? '#525252' : '#000000',
        });
        break;
    }

    // Add custom text style
    if (textStyle) {
      baseStyle.push(textStyle);
    }

    return baseStyle;
  };

  const getLoadingColor = () => {
    switch (variant) {
      case 'primary':
      case 'success':
      case 'error':
      case 'warning':
        return colors.white;
      default:
        return '#FFE66C';
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoadingColor()} />
      ) : (
        <>
          {leftIcon}
          <Text style={getTextStyles()}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 51,
  },
  fullWidth: {
    width: '100%',
  },
  // Size styles
  xs: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 32,
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    minHeight: 48,
  },
  xl: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  xsText: {
    fontSize: 12,
  },
  smText: {
    fontSize: 14,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
  xlText: {
    fontSize: 20,
  },
});

export default Button;