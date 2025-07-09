import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';
import { ArrowLeft } from 'lucide-react-native';
import RecipientDetailCard from '@/components/common/RecipientDetailCard';
import AmountPill from '@/components/common/AmountPill';
import Button from '@/components/common/Button';
import TransactionPinModal from '@/components/common/TransactionPinModal';

const predefinedAmounts = ['N5,000', 'N10,000', 'N20,000'];

export default function TransferScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  
  // Extract navigation params (from camera extraction)
  const extractedBankName = params.bankName as string || '';
  const extractedAccountNumber = params.accountNumber as string || '';
  const extractedAccountHolderName = params.accountHolderName as string || '';
  const extractedAmount = params.amount as string || '';

  // Set initial states based on extracted data
  const [amount, setAmount] = useState(extractedAmount || '');
  const [selectedPill, setSelectedPill] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  const walletBalance = 'N256,311.12';

  // Use extracted data or fallback defaults
  const recipientName = extractedAccountHolderName || 'Abdullahi Ogirima Mohammad';
  const accountNumber = extractedAccountNumber || '1123456985';
  const bankName = extractedBankName || 'PalmPay';

  useEffect(() => {
    // If we have an extracted amount, format it properly
    if (extractedAmount && extractedAmount !== '0') {
      const cleanAmount = extractedAmount.replace(/[^\d.]/g, '');
      if (cleanAmount) {
        setAmount(cleanAmount);
      }
    }
  }, [extractedAmount]);

  const handleBackPress = () => {
    router.back();
  };

  const handleAmountChange = (text: string) => {
    // Remove any non-numeric characters except decimal point
    const numericValue = text.replace(/[^\d.]/g, '');
    
    // Format with commas for thousands
    const parts = numericValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formattedValue = parts.join('.');
    
    setAmount(formattedValue);
    setSelectedPill(null);
  };

  const handlePillPress = (pillAmount: string) => {
    setSelectedPill(pillAmount);
    // Remove N and keep commas for display
    const numericAmount = pillAmount.replace('N', '');
    setAmount(numericAmount);
  };

  const formatAmount = (value: string) => {
    if (!value) return '0';
    // Remove existing commas first
    const cleanValue = value.replace(/,/g, '');
    const num = parseFloat(cleanValue);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  const handlePay = () => {
    if (!amount || amount === '0') {
      Alert.alert('Invalid Amount', 'Please enter an amount to transfer');
      return;
    }
    
    // Show PIN modal instead of direct confirmation
    setShowPinModal(true);
  };

  const handlePinConfirm = (pin: string) => {
    // Handle PIN verification here
    console.log('PIN entered:', pin);
    
    // Close PIN modal
    setShowPinModal(false);
    
    // Show success message
    Alert.alert('Success!', 'Transfer completed successfully!', [
      { text: 'OK', onPress: () => router.push('/') }
    ]);
  };

  const handlePinModalClose = () => {
    setShowPinModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transfer</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Recipient Detail Card */}
          <RecipientDetailCard
            name={recipientName}
            accountNumber={accountNumber}
            bankName={bankName}
          />

          {/* Amount Input */}
          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <View style={styles.amountInputContainer}>
                <Text style={styles.amountPrefix}>N</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="rgba(245, 200, 66, 0.5)"
                  autoFocus={true}
                  selectionColor="#F5C842"
                />
              </View>
              <Text style={styles.balanceText}>
                Bal: {walletBalance}
              </Text>
            </View>
            
            {/* Show pre-filled amount indicator */}
            {extractedAmount && extractedAmount !== '0' && (
              <Text style={styles.prefilledText}>
                Amount extracted from image: N{formatAmount(extractedAmount)}
              </Text>
            )}
          </View>

          {/* Amount Pills */}
          <View style={styles.pillsContainer}>
            {predefinedAmounts.map((pillAmount) => (
              <AmountPill
                key={pillAmount}
                amount={pillAmount}
                isSelected={selectedPill === pillAmount}
                onPress={() => handlePillPress(pillAmount)}
                style={styles.pill}
              />
            ))}
          </View>
        </View>

        {/* Pay Button */}
        <View style={styles.payButtonContainer}>
          <Button
            title="Pay"
            onPress={handlePay}
            disabled={!amount || amount === '0'}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>

      {/* Transaction PIN Modal */}
      <TransactionPinModal
        visible={showPinModal}
        onClose={handlePinModalClose}
        onConfirm={handlePinConfirm}
        recipientName={recipientName}
        accountNumber={accountNumber}
        bankName={bankName}
        amount={formatAmount(amount)}
        fee="10.00"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  extractionBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  extractionText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: '#10B981',
  },
  amountSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  amountPrefix: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.regular,
    color: '#FFE66C',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFE66C',
    flex: 1,
    padding: 0,
    margin: 0,
    minHeight: 40,
  },
  balanceText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 16,
  },
  prefilledText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(245, 200, 66, 0.7)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  pillsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 40,
  },
  pill: {
    flex: 1,
  },
  payButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  }
});