import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { PaymentSuggestion } from '@/services/LocationService';

interface PaymentSuggestionCardProps {
  suggestion: PaymentSuggestion;
  onPress: (suggestion: PaymentSuggestion) => void;
}

export default function PaymentSuggestionCard({ suggestion, onPress }: PaymentSuggestionCardProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.textContent}>
          <Text style={styles.businessName} numberOfLines={1}>
            {suggestion.accountName}
          </Text>
          <Text style={styles.accountDetails}>
            {suggestion.accountNumber} - {suggestion.bankName}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => onPress(suggestion)}
          activeOpacity={0.7}
        >
          <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textContent: {
    flex: 1,
    marginRight: 12,
  },
  businessName: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  accountDetails: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 