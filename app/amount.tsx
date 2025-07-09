import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { Button, BankTransferModal } from '@/components/common';
import { SendHeader } from '@/components/layout';
import { Delete } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function AmountScreen() {
  const { colors } = useTheme();
  const [amount, setAmount] = useState('0');
  const [isTyping, setIsTyping] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const balance = "2450";

  const keypadData = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace']
  ];

  const handleClose = () => {
    router.back();
  };

  const handleScan = () => {
    console.log('Scan pressed');
    // TODO: Implement scan functionality
  };

  const formatAmount = (value: string) => {
    const parts = value.split('.');
    const wholePart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${wholePart}.${parts[1]}` : wholePart;
  };

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      if (amount.length > 1) {
        const newAmount = amount.replace(/,/g, '').slice(0, -1);
        setAmount(newAmount);
      } else {
        setAmount('0');
        setIsTyping(false);
      }
    } else if (key === '.') {
      if (!amount.includes('.')) {
        if (!isTyping) {
          setAmount('0.');
          setIsTyping(true);
        } else {
          setAmount(amount.replace(/,/g, '') + '.');
        }
      }
    } else {
      let newAmount;
      const cleanAmount = amount.replace(/,/g, '');
      
      if (!isTyping) {
        newAmount = key;
        setIsTyping(true);
      } else {
        if (cleanAmount === '0' && key === '0') return;
        if (cleanAmount === '0' && key !== '.') {
          newAmount = key;
        } else {
          newAmount = cleanAmount + key;
        }
      }

      // Prevent amount from becoming too large
      if (newAmount.replace(/[.,]/g, '').length > 15) return;
      
      setAmount(newAmount);
    }
  };

  const handleAddFunds = () => {
    if (amount !== '0' && parseFloat(amount.replace(/,/g, '')) > 0) {
      setShowBankModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowBankModal(false);
  };

  const handleConfirmTransfer = () => {
    // Handle confirm transfer logic
    console.log('Transfer confirmed for amount:', amount);
  };

  const handleSuccess = () => {
    setShowBankModal(false);
    Alert.alert(
      'Success!',
      `₦${formatAmount(amount)} has been added to your wallet.`,
      [
        {
          text: 'OK',
          onPress: () => router.back(), // Go back to camera screen
        },
      ]
    );
  };

  const renderKeypadButton = (key: string) => {
    const isBackspace = key === 'backspace';
    const isDisabled = !isTyping && key === '.';
    
    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.keypadButton,
          isDisabled && styles.keypadButtonDisabled
        ]}
        onPress={() => handleKeyPress(key)}
        activeOpacity={0.7}
        disabled={isDisabled}
      >
        {isBackspace ? (
          <Delete size={24} color={colors.white} strokeWidth={2} />
        ) : (
          <Text style={[
            styles.keypadButtonText,
            isDisabled && styles.keypadButtonTextDisabled
          ]}>
            {key}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Calculate font size based on amount length and value
  const getFontSize = () => {
    const displayAmount = formatAmount(amount);
    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    
    if (numericAmount >= 1000000) return 36;
    if (displayAmount.length > 12) return 48;
    return 72;
  };

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
        {/* Header */}
        <SendHeader
          title="Add Funds"
          onClose={handleClose}
          onScan={handleScan}
        />

        {/* Amount Display */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amountText, { fontSize: getFontSize() }]}>₦{formatAmount(amount)}</Text>
          <View style={styles.balancePill}>
            <Text style={styles.balanceText}>Bal: ₦{formatAmount(balance)}</Text>
          </View>
        </View>

        {/* Keypad */}
        <View style={styles.keypadContainer}>
          {keypadData.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key) => renderKeypadButton(key))}
            </View>
          ))}
        </View>

        {/* Add Button */}
        <View style={styles.addButtonContainer}>
          <Button
            title="Add Funds"
            variant="white"
            size="lg"
            fullWidth
            onPress={handleAddFunds}
            disabled={amount === '0' || parseFloat(amount.replace(/,/g, '')) <= 0}
            style={{
              ...styles.addButton,
              backgroundColor: (amount !== '0' && parseFloat(amount.replace(/,/g, '')) > 0)
                ? 'rgba(255, 255, 255, 0.9)'
                : 'rgba(255, 255, 255, 0.3)',
              shadowColor: 'transparent',
              shadowOffset: {width: 0, height: 0},
              shadowOpacity: 0,
              shadowRadius: 0,
              elevation: 0
            }}
            textStyle={{
              ...styles.addButtonText,
              color: (amount !== '0' && parseFloat(amount.replace(/,/g, '')) > 0)
                ? colors.primary
                : 'rgba(255, 255, 255, 0.6)',
            }}
          />
        </View>
      </SafeAreaView>

      {/* Bank Transfer Modal */}
      <BankTransferModal
        visible={showBankModal}
        onClose={handleCloseModal}
        onConfirmTransfer={handleConfirmTransfer}
        onSuccess={handleSuccess}
        amount={amount}
        nairaAmount={formatAmount(amount)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    marginTop: 60,
    marginBottom: -40,
  },
  amountText: {
    color: '#000',
    fontFamily: fontFamilies.clashDisplay.bold,
    fontWeight: '700',
    lineHeight: 80,
    marginBottom: 8,
  },
  balancePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  balanceText: {
    color: 'rgba(18, 17, 17, 0.8)',
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.semiBold,
    fontWeight: '600',
  },
  keypadContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  keypadButton: {
    width: (screenWidth - 120) / 3,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  keypadButtonDisabled: {
    opacity: 0.3,
  },
  keypadButtonText: {
    color: '#000',
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamilies.sora.semiBold,
    fontWeight: '600',
  },
  keypadButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  addButtonContainer: {
    paddingHorizontal: 100,
    paddingBottom: 10,
    marginTop: -40,
  },
  addButton: {
    borderRadius: 66,
    paddingVertical: 16,
  },
  addButtonText: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.semiBold,
    fontWeight: '600',
    lineHeight: 24,
  },
});