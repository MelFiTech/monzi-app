import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';

interface FloatingButtonProps {
  icon: any; // Image source or React element
  onPress: () => void;
  style?: any;
}

export default function FloatingButton({ icon, onPress, style }: FloatingButtonProps) {
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
      onPress={onPress}
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