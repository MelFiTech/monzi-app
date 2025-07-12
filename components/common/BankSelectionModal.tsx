import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList, TextInput, Animated, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { fontFamilies } from '@/constants/fonts';
import { X, ChevronRight, Building2, RefreshCw } from 'lucide-react-native';
import { useBanks } from '@/hooks/useAccountService';

interface Bank {
  name: string;
  code: string;
}

interface BankSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBank: (bankName: string) => void;
}

// Fallback banks in case API fails
const FALLBACK_BANKS: Bank[] = [
  { name: 'Opay', code: '999' },
  { name: 'Moniepoint', code: '090' },
  { name: 'Palmpay', code: '999' },
  { name: 'GT Bank', code: '058' },
  { name: 'Access Bank', code: '044' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'First Bank', code: '011' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank', code: '032' },
  { name: 'Wema Bank', code: '035' },
  { name: 'FCMB', code: '214' },
  { name: 'Ecobank', code: '050' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Kuda', code: '090' },
  { name: 'VFD Microfinance Bank', code: '090' },
];

export default function BankSelectionModal({
  visible,
  onClose,
  onSelectBank
}: BankSelectionModalProps) {
  const [slideAnim] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBanks, setFilteredBanks] = useState<Bank[]>([]);
  
  // Fetch banks from API
  const { data: apiBanks, isLoading, error, refetch } = useBanks();

  // Process banks data - convert API response to expected format
  const processedBanks: Bank[] = React.useMemo(() => {
    if (apiBanks && Array.isArray(apiBanks)) {
      return apiBanks.map((bank: any) => ({
        name: bank.name || bank.bankName || bank.bank_name || 'Unknown Bank',
        code: bank.code || bank.bankCode || bank.bank_code || '000'
      }));
    }
    return FALLBACK_BANKS;
  }, [apiBanks]);

  // Use processed banks or fallback if API fails
  const banksToUse = error ? FALLBACK_BANKS : processedBanks;

  // Slide animation effect
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(300);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  }, [visible, slideAnim]);

  // Filter banks based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBanks(banksToUse);
    } else {
      const filtered = banksToUse.filter(bank =>
        bank.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBanks(filtered);
    }
  }, [searchQuery, banksToUse]);

  const handleModalPress = (event: any) => {
    event.stopPropagation();
  };

  const handleBankSelect = (bankName: string) => {
    onSelectBank(bankName);
    setSearchQuery('');
    onClose();
  };

  const handleRetry = () => {
    refetch();
  };

  const renderBankItem = ({ item }: { item: Bank }) => (
    <TouchableOpacity
      style={styles.bankItem}
      onPress={() => handleBankSelect(item.name)}
      activeOpacity={0.7}
    >
      <View style={styles.bankContent}>
        <Building2 size={24} color="rgba(255, 255, 255, 0.6)" style={styles.bankIcon} />
        <Text style={styles.bankName}>{item.name}</Text>
      </View>
      <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5C842" />
          <Text style={styles.loadingText}>Loading banks...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load banks</Text>
          <Text style={styles.errorSubtext}>Using offline bank list</Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <RefreshCw size={16} color="#F5C842" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredBanks}
        renderItem={renderBankItem}
        keyExtractor={(item, index) => `${item.code}-${index}`}
        showsVerticalScrollIndicator={false}
        style={styles.banksList}
        contentContainerStyle={styles.banksListContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No banks found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search</Text>
          </View>
        }
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={8} style={styles.blurView}>
          <View style={styles.modalContainer}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              <TouchableOpacity
                style={styles.content}
                activeOpacity={1}
                onPress={handleModalPress}
              >
                {/* Header */}
                <View style={styles.header}>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <X size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.headerText}>Select bank</Text>
                  <View style={styles.spacer} />
                </View>

                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for a bank"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>

                {/* Bank List / Loading / Error */}
                {renderContent()}

              </TouchableOpacity>
            </Animated.View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 44, 44, 0.74)',
    justifyContent: 'flex-end',
  },
  blurView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: -300,
  },
  modalContent: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  content: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 24,
  },
  headerText: {
    fontSize: 24,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
  },
  searchInput: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: '#FFFFFF',
  },
  banksList: {
    flex: 1,
  },
  banksListContent: {
    paddingBottom: 20,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  bankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIcon: {
    marginRight: 16,
  },
  bankName: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: '#FFFFFF',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 5,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    color: '#F5C842',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 5,
  },
}); 