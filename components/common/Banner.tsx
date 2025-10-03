import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fontFamilies } from '@/constants/fonts';

interface BannerProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  visible?: boolean;
  onClose?: () => void;
  backgroundColor?: string;
  textColor?: string;
  showCloseButton?: boolean;
}

export const Banner: React.FC<BannerProps> = ({
  title,
  subtitle,
  onPress,
  visible = true,
  onClose,
  backgroundColor = '#FFE66C',
  textColor = '#000000',
  showCloseButton = true,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.container}
    >
      <View style={[styles.banner, { backgroundColor }]}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: textColor }]}>{subtitle}</Text>
            )}
          </View>
          {showCloseButton && onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 240, // Same position as suggestion strip
    left: 15,
    right: 15,
    zIndex: 50, // Higher than HeaderCard to ensure visibility
  },
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: fontFamilies.clashDisplay.bold,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    opacity: 0.8,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeIcon: {
    fontSize: 14,
    color: '#000000',
    fontFamily: fontFamilies.sora.semiBold,
  },
});
