import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
  TextStyle,
  Image,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';

const { width: screenWidth } = Dimensions.get('window');

interface SlideToPayButtonProps {
  title?: string;
  onComplete: () => void;
  disabled?: boolean;
  processing?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  threshold?: number; // Percentage of width to slide (0-1)
}

export function SlideToPayButton({
  title = 'Slide to pay...',
  onComplete,
  disabled = false,
  processing = false,
  style,
  textStyle,
  threshold = 0.8, // 80% of the button width
}: SlideToPayButtonProps) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [isCompleted, setIsCompleted] = useState(false);
  const dotAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  const buttonWidth = screenWidth - 48; // Full width minus padding
  const handleWidth = 84; // Width of the handle container
  const maxSlideDistance = buttonWidth - handleWidth - 8; // Subtract 4px margin on both sides (4 + 4 = 8)
  const completionThreshold = maxSlideDistance * threshold;

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (translationX >= completionThreshold) {
        // Complete the slide
        Animated.spring(translateX, {
          toValue: maxSlideDistance,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start(() => {
          setIsCompleted(true);
          
          // Start dot loader animation
          startDotLoader();
          
          // Wait 2.5 seconds to show the completed state, then call onComplete
          setTimeout(() => {
            onComplete();
          }, 2500);
        });
      } else {
        // Reset to start position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  const startDotLoader = () => {
    // Create staggered dot animations
    const animations = dotAnimations.map((dot, index) => 
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      )
    );
    
    // Start animations with staggered delays
    animations.forEach((animation, index) => {
      setTimeout(() => {
        animation.start();
      }, index * 200);
    });
  };

  const resetButton = () => {
    setIsCompleted(false);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    
    // Reset dot animations
    dotAnimations.forEach(dot => dot.setValue(0));
  };

  // Reset button when disabled changes
  React.useEffect(() => {
    if (disabled) {
      resetButton();
    }
  }, [disabled]);

  const getButtonStyles = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.button];
    
    // Add disabled or processing state
    if (disabled || processing) {
      baseStyle.push({
        backgroundColor: '#242424',
        opacity: 0.5,
      } as ViewStyle);
    } else if (isCompleted) {
      baseStyle.push({
        backgroundColor: '#FFE66C',
      } as ViewStyle);
    } else {
      baseStyle.push({
        backgroundColor: '#242424',
      } as ViewStyle);
    }

    // Add custom style
    if (style) {
      baseStyle.push(style);
    }

    return baseStyle;
  };

  const getTextStyles = (): TextStyle[] => {
    const baseStyle: TextStyle[] = [styles.text, typography.button.medium];

    // Add disabled or processing state
    if (disabled || processing) {
      baseStyle.push({
        color: '#525252',
      } as TextStyle);
    } else if (isCompleted) {
      baseStyle.push({
        color: '#000000',
      } as TextStyle);
    } else {
      baseStyle.push({
        color: '#525252',
      } as TextStyle);
    }

    // Add custom text style
    if (textStyle) {
      baseStyle.push(textStyle);
    }

    return baseStyle;
  };

  return (
    <View style={getButtonStyles()}>
      {/* Background text - only show if not completed */}
      {!isCompleted && <Text style={getTextStyles()}>{title}</Text>}
      
      {/* 3-dot loader when completed */}
      {isCompleted && (
        <View style={styles.dotLoaderContainer}>
          {dotAnimations.map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: dot,
                },
              ]}
            />
          ))}
        </View>
      )}
      
      {/* Draggable handle */}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleStateChange}
        enabled={!disabled && !processing && !isCompleted}
      >
        <Animated.View
          style={[
            styles.handle,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.handleContent}>
            {!isCompleted && <ChevronRight size={24} color="#000000" />}
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 51,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  text: {
    position: 'absolute',
    zIndex: 1,
    textAlign: 'center',
  },
  handle: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 84,
    zIndex: 2,
  },
  handleContent: {
    flex: 1,
    backgroundColor: '#FFE66C',
    borderRadius: 25.5,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4, // Small margin to show the background
  },
  dotLoaderContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
  },
});

export default SlideToPayButton;