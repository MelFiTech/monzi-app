import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { fontFamilies } from '@/constants/fonts';

interface Bank {
  name: string;
  code: string;
}

interface BankPillSelectorProps {
  onSelectBank: (bankName: string) => void;
  selectedBank?: string;
  availableBanks?: Bank[];
  isLoading?: boolean;
}

// Popular digital bank names (codes will be fetched from API)
const POPULAR_DIGITAL_BANK_NAMES: string[] = [
  'Opay',
  'Moniepoint',
  'Kuda',
  'Polaris Bank',
  'Palmpay',
  'GT Bank',
  'Access Bank',
  'Zenith Bank',
];

const { width: screenWidth } = Dimensions.get('window');

export default function BankPillSelector({ onSelectBank, selectedBank, availableBanks = [], isLoading = false }: BankPillSelectorProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  const handleBankSelect = (bankName: string) => {
    if (!isLoading) {
      onSelectBank(bankName);
    }
  };

  // Filter available banks to only show popular ones
  const popularBanks = availableBanks.filter(bank => 
    POPULAR_DIGITAL_BANK_NAMES.includes(bank.name)
  );

  // Always show pills - use API data if available, otherwise show placeholders
  const banksToShow = popularBanks.length > 0 
    ? popularBanks 
    : POPULAR_DIGITAL_BANK_NAMES.map(name => ({ name, code: '' }));

  // Final fallback - ensure we always have pills to show
  const finalBanksToShow = banksToShow.length > 0 
    ? banksToShow 
    : [{ name: 'Loading...', code: '' }];

  const renderBankPill = (bank: Bank) => {
    const isSelected = selectedBank === bank.name;
    
    return (
      <TouchableOpacity
        key={`${bank.code}-${bank.name}`}
        style={[
          styles.bankPill,
          isSelected && styles.selectedBankPill,
          isLoading && styles.disabledBankPill
        ]}
        onPress={() => handleBankSelect(bank.name)}
        activeOpacity={isLoading ? 1 : 0.7}
        disabled={isLoading}
      >
        <Text style={[
          styles.bankPillText,
          isSelected && styles.selectedBankPillText,
          isLoading && styles.disabledBankPillText
        ]}>
          {bank.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        decelerationRate="fast"
        snapToInterval={130} // Width of pill + margin
        snapToAlignment="start"
      >
        {finalBanksToShow.map(renderBankPill)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    minHeight: 60, // Ensure minimum height for visibility
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  bankPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)', // Slightly more visible
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // More visible border
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15, // More visible shadow
    shadowRadius: 4,
    elevation: 4, // More elevation
  },
  selectedBankPill: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842',
    shadowColor: '#F5C842',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bankPillText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  selectedBankPillText: {
    color: '#000000',
    fontFamily: fontFamilies.sora.semiBold,
  },
  disabledBankPill: {
    opacity: 0.5,
  },
  disabledBankPillText: {
    opacity: 0.7,
  },
}); 