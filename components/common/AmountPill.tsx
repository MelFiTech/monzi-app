import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';

interface AmountPillProps {
  amount: string;
  isSelected: boolean;
  onPress: () => void;
  style?: any;
}

export default function AmountPill({ amount, isSelected, onPress, style }: AmountPillProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        {
          backgroundColor: isSelected 
            ? '#FFE66C'
            : '#181818',
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.pillText,
          {
            color: isSelected 
              ? '#000000'
              : '#FFFFFF',
          },
        ]}
      >
        {amount}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 39,
  },
  pillText: {
    fontFamily: fontFamilies.sora.semiBold,
    fontSize: 14,
    textAlign: 'center',
  },
}); 