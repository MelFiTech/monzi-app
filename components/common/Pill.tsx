import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fontFamilies } from '@/constants/fonts';

interface PillProps {
  title: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof FontAwesome.glyphMap;
}

export const Pill: React.FC<PillProps> = ({
  title,
  onPress,
  active = false,
  disabled = false,
  iconName,
}) => {
  const handlePress = () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        style={styles.touchable}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // Increase touch area by 15px on all sides
      >
        <View
          style={[
            styles.pill,
            active && styles.pillActive,
            disabled && styles.pillDisabled,
          ]}
        >
          {/* Inner shadow effect using gradient overlay */}
          <LinearGradient
            colors={[
              'rgba(0, 0, 0, 0)',
              'rgba(255, 255, 255, 0.05)',
              'rgba(0, 0, 0, 0.1)',
              'rgba(0, 0, 0, 0.44)',
            ]}
            locations={[0, 0.3, 0.7, 1]}
            style={styles.innerShadow}
            pointerEvents="none" // Allow touches to pass through to TouchableOpacity
          />
          {iconName && (
            <FontAwesome
              name={iconName}
              size={18}
              color={active ? '#FFE66C' : '#FFFFFF'}
              style={styles.icon}
            />
          )}
        </View>
      </TouchableOpacity>
      <Text style={[
        styles.pillText,
        active && styles.pillTextActive,
        disabled && styles.pillTextDisabled,
      ]}>
        {title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8, // Increased vertical spacing for easier tapping
    paddingHorizontal: 4, // Add horizontal padding for better touch area
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4, // Add vertical padding to increase touch area
    paddingHorizontal: 4, // Add horizontal padding to increase touch area
  },
  pill: {
    backgroundColor: 'rgba(0, 0, 0, 0.11)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 25, // Make it circular
    width: 50, // Fixed circular width - smaller
    height: 50, // Fixed circular height - smaller
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Inner shadow effect using multiple box shadows
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  pillActive: {
    backgroundColor: 'rgba(255, 231, 108, 0.46)',
    shadowColor: '#FFE66C',
    shadowOpacity: 0.6,
  },
  pillDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    shadowOpacity: 0.2,
  },
  icon: {
    // No margin needed since text is outside
  },
  pillText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8, // Space between circle and text
  },
  pillTextActive: {
    color: '#FFE66C',
  },
  pillTextDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  innerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25, // Match the new pill borderRadius
  },
});
