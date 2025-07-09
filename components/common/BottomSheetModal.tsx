import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
}

export default function BottomSheetModal({
  visible,
  onClose,
  children,
  height = 300,
}: BottomSheetModalProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          mass: 1,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: height,
          damping: 20,
          mass: 1,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, height]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View 
            style={[
              styles.backdrop,
              { opacity: opacityAnim }
            ]} 
          />
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  height,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <BlurView
                intensity={100}
                tint="systemUltraThinMaterialDark"
                style={styles.blurContainer}
              >
                <View style={styles.handleContainer}>
                  <View style={styles.handle} />
                </View>
                <View style={styles.content}>
                  {children}
                </View>
              </BlurView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    borderTopLeftRadius: Platform.OS === 'ios' ? 20 : 32,
    borderTopRightRadius: Platform.OS === 'ios' ? 20 : 32,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: Platform.OS === 'ios' ? 0.15 : 0.25,
    shadowRadius: Platform.OS === 'ios' ? 16 : 8,
    elevation: 16,
  },
  blurContainer: {
    flex: 1,
    borderTopLeftRadius: Platform.OS === 'ios' ? 20 : 32,
    borderTopRightRadius: Platform.OS === 'ios' ? 20 : 32,
    overflow: 'hidden',
  },
  handleContainer: {
    paddingVertical: Platform.OS === 'ios' ? 8 : 12,
    alignItems: 'center',
    borderBottomWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  handle: {
    width: Platform.OS === 'ios' ? 40 : 36,
    height: Platform.OS === 'ios' ? 6 : 5,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.3)',
    borderRadius: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 40,
  },
}); 