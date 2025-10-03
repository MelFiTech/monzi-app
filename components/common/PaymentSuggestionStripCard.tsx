import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { fontFamilies } from '@/constants/fonts';
import { PaymentSuggestion } from '@/services/LocationService';

interface PaymentSuggestionStripCardProps {
  suggestion: PaymentSuggestion;
  onPress: (suggestion: PaymentSuggestion) => void;
}

export const PaymentSuggestionStripCard: React.FC<PaymentSuggestionStripCardProps> = ({
  suggestion,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.touchable} onPress={() => onPress(suggestion)} activeOpacity={0.7}>
      <BlurView intensity={50} tint="dark" style={styles.card}>
        <View style={styles.textContainer}>
          <Text style={styles.nameText} numberOfLines={1}>
            {suggestion.accountName}
          </Text>
          <Text style={styles.accountText} numberOfLines={1}>
            {suggestion.accountNumber} • {suggestion.bankName}
          </Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginRight: 10,
    minWidth: 200,
    maxWidth: 250,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(45, 45, 45, 0.2)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 200,
    maxWidth: 250,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0)',
    // Removed shadow and elevation for no inner shadows
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
    zIndex: 1,
  },
  nameText: {
    fontFamily: fontFamilies.clashDisplay.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  accountText: {
    fontFamily: fontFamilies.sora.semiBold,
    fontSize: 12,
    color: '#FFE66C',
    marginTop: 2,
  },
});
