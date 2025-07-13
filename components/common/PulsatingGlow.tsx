import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, ViewStyle } from 'react-native';

interface PulsatingGlowProps {
  size?: number;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  animationDuration?: number;
}

export default function PulsatingGlow({
  size = 146,
  style,
  containerStyle,
  animationDuration = 2000,
}: PulsatingGlowProps) {
  const pulseAnimation = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: animationDuration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0.7,
          duration: animationDuration / 2,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [animationDuration]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            opacity: pulseAnimation,
            transform: [{ scale: pulseAnimation }],
          },
          style,
        ]}
      >
        <Image
          source={require('@/assets/images/glow.png')}
          style={[styles.glowImage, { width: size, height: size }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowImage: {
    width: 146,
    height: 146,
  },
}); 