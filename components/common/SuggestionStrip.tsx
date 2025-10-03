import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentSuggestionStripCard } from './PaymentSuggestionStripCard';
import { PaymentSuggestion } from '@/services/LocationService';
import { fontFamilies } from '@/constants/fonts';

interface SuggestionStripProps {
  suggestions: PaymentSuggestion[];
  onSuggestionPress: (suggestion: PaymentSuggestion) => void;
  onClose?: () => void;
  visible?: boolean;
  isLoading?: boolean;
}

export const SuggestionStrip: React.FC<SuggestionStripProps> = ({
  suggestions,
  onSuggestionPress,
  onClose,
  visible = true,
  isLoading = false,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      <View style={styles.scrollViewWrapper}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFE66C" />
            <Text style={styles.loadingText}>Finding suggestions...</Text>
          </View>
        ) : suggestions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollViewContent}
          >
            {suggestions.map((suggestion, index) => (
              <PaymentSuggestionStripCard
                key={`${suggestion.accountNumber}-${index}`}
                suggestion={suggestion}
                onPress={onSuggestionPress}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noSuggestionsContainer}>
            <Text style={styles.noSuggestionsText}>No suggestions available</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 240, // Position above camera controls (moved up)
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 0,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    zIndex: 50, // Higher than HeaderCard to ensure visibility
  },
  closeButton: {
    padding: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollViewWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  scrollViewContent: {
    paddingRight: 15,
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
  },
  noSuggestionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  noSuggestionsText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
