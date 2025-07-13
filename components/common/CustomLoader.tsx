import React from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface CustomLoaderProps {
  size?: 'small' | 'medium' | 'large' | number;
  color?: string;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  animationDuration?: number;
}

export default function CustomLoader({
  size = 'large',
  color,
  style,
  containerStyle,
  animationDuration = 1000,
}: CustomLoaderProps) {
  const { colors } = useTheme();
  const spinValue = new Animated.Value(0);

  // Calculate size
  const getSize = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'small': return 24;
      case 'medium': return 32;
      case 'large': return 48;
      default: return 48;
    }
  };

  const loaderSize = getSize();
  const finalColor = color || colors.primary;

  // Spin animation
  React.useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      }).start(() => spin());
    };
    spin();
  }, [animationDuration]);

  const spinInterpolation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View
        style={[
          styles.loader,
          {
            width: loaderSize,
            height: loaderSize,
            borderColor: finalColor,
            borderTopColor: 'transparent',
            transform: [{ rotate: spinInterpolation }],
          },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    borderWidth: 3,
    borderRadius: 50,
  },
}); 