import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fontFamilies } from '@/constants/fonts';
import Button from '@/components/common/Button';
import PhoneNumberInput from '@/components/auth/PhoneNumberInput';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { BillsService, AirtimePurchaseRequest } from '@/services';
import { useWalletBalance } from '@/hooks/useWalletService';
import ToastService from '@/services/ToastService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Network {
  id: string;
  name: string;
  code: string;
}

const predefinedAmounts = ['N100', 'N200', 'N500', 'N1,000', 'N2,000', 'N5,000'];
const networks: Network[] = [
  { id: 'mtn', name: 'MTN', code: 'MTN' },
  { id: 'glo', name: 'GLO', code: 'GLO' },
  { id: 'airtel', name: 'Airtel', code: 'AIRTEL' },
  { id: '9mobile', name: '9mobile', code: '9MOBILE' },
];

export default function AirtimeModalScreen() {
  const { colors } = useTheme();
  const { authToken } = useAuth();
  const { data: walletBalance, isLoading: isBalanceLoading } = useWalletBalance();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rawPhoneNumber, setRawPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedPill, setSelectedPill] = useState<string | null>(null);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<{
    phoneNumber?: string;
    network?: string;
    amount?: string;
  }>({});

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animation when component mounts
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Validate phone number
    if (!rawPhoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^0[789][01]\d{8}$/.test(rawPhoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Nigerian phone number';
    }

    // Validate network
    if (!selectedNetwork) {
      newErrors.network = 'Please select a network';
    }

    // Validate amount
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
      if (isNaN(numericAmount) || numericAmount < 50) {
        newErrors.amount = 'Minimum amount is N50';
      } else if (walletBalance && numericAmount > walletBalance.balance) {
        newErrors.amount = 'Insufficient balance';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    return rawPhoneNumber.trim() &&
           /^0[789][01]\d{8}$/.test(rawPhoneNumber) &&
           selectedNetwork &&
           amount.trim() &&
           numericAmount >= 50 &&
           (!walletBalance || numericAmount <= walletBalance.balance);
  };

  const handleConfirm = async () => {
    if (!validateForm() || !authToken) {
      return;
    }

    // Double-check balance before proceeding
    const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (walletBalance && numericAmount > walletBalance.balance) {
      ToastService.error('Insufficient balance for this purchase');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    
    try {
      const request: AirtimePurchaseRequest = {
        phoneNumber: rawPhoneNumber,
        amount: parseInt(amount.replace(/[^0-9]/g, ''))
      };

      const response = await BillsService.purchaseAirtime(request, authToken);
      
      if (response.success) {
        // Navigate to bill success screen
        router.push({
          pathname: '/bill-success',
          params: {
            amount: amount.replace(/[^0-9.]/g, ''),
            phoneNumber: rawPhoneNumber,
            network: selectedNetwork!.code,
            reference: response.reference,
            billType: 'airtime',
          }
        });
      } else {
        ToastService.error('Airtime purchase failed');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Airtime purchase error:', error);
      ToastService.error('Failed to purchase airtime. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleAmountPillPress = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cleanAmount = value.replace('N', '').replace(',', '');
    setAmount(cleanAmount);
    setSelectedPill(value);
    setShowCustomAmount(false);
    setErrors(prev => ({ ...prev, amount: undefined }));
  };

  const handleCustomAmountPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCustomAmount(true);
    setSelectedPill(null);
    setAmount('');
  };

  const handleNetworkSelect = (network: Network) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNetwork(network);
    setErrors(prev => ({ ...prev, network: undefined }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Buy Airtime</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <FontAwesome name="times" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Balance Display */}
              <View style={styles.balanceContainer}>
                {isBalanceLoading ? (
                  <Text style={styles.balanceText}>Loading...</Text>
                ) : (
                  <View style={styles.balanceAmountContainer}>
                    {(() => {
                      const balanceText = walletBalance?.formattedBalance || '₦0.00';
                      const decimalIndex = balanceText.indexOf('.');
                      
                      if (decimalIndex === -1) {
                        return <Text style={styles.balanceText}>{`Bal: ${balanceText}`}</Text>;
                      }
                      
                      const nairapart = balanceText.substring(0, decimalIndex);
                      const kobopart = balanceText.substring(decimalIndex);
                      
                      return (
                        <>
                          <Text style={styles.balanceText}>{`Bal: ${nairapart}`}</Text>
                          <Text style={styles.balanceKoboText}>{kobopart}</Text>
                        </>
                      );
                    })()}
                  </View>
                )}
              </View>

              {/* Scrollable Content */}
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Phone Number Input */}
                <View style={styles.inputGroup}>
                  <PhoneNumberInput
                    label="Phone Number"
                    value={phoneNumber}
                    onChangeText={(formattedValue: string, rawValue: string) => {
                      setPhoneNumber(formattedValue);
                      setRawPhoneNumber(rawValue);
                      setErrors(prev => ({ ...prev, phoneNumber: undefined }));
                    }}
                    error={errors.phoneNumber}
                    returnKeyType="done"
                    onSubmitEditing={() => {}}
                  />
                </View>

                {/* Network Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Select Network</Text>
                  <View style={styles.networkGrid}>
                    {networks.map((network) => (
                      <TouchableOpacity
                        key={network.id}
                        style={[
                          styles.networkPill,
                          selectedNetwork?.id === network.id && styles.networkPillActive,
                        ]}
                        onPress={() => handleNetworkSelect(network)}
                      >
                        <Text style={[
                          styles.networkText,
                          { color: selectedNetwork?.id === network.id ? '#FFE66C' : '#FFFFFF' }
                        ]}>
                          {network.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.network && <Text style={styles.errorText}>{errors.network}</Text>}
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Amount</Text>
                  {!showCustomAmount ? (
                    <View style={styles.amountPillsContainer}>
                      {predefinedAmounts.map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={[
                            styles.amountPill,
                            selectedPill === amt && styles.amountPillActive,
                          ]}
                          onPress={() => handleAmountPillPress(amt)}
                        >
                          <Text style={[
                            styles.amountPillText,
                            selectedPill === amt && styles.amountPillTextActive,
                          ]}>
                            {amt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[
                          styles.amountPill,
                          styles.customAmountPill,
                        ]}
                        onPress={handleCustomAmountPress}
                      >
                        <Text style={styles.amountPillText}>
                          Custom Amount
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TextInput
                      style={[styles.amountInput, errors.amount && styles.amountInputError]}
                      placeholder="Enter custom amount"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={(text) => {
                        setAmount(text.replace(/[^0-9]/g, ''));
                        setErrors(prev => ({ ...prev, amount: undefined }));
                      }}
                      cursorColor="#FFE66C"
                      selectionColor="#FFE66C"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => {}}
                    />
                  )}
                  {errors.amount && (
                    <Text style={styles.errorText}>{errors.amount}</Text>
                  )}
                </View>

                {/* Spacer to ensure content is not hidden behind button */}
                <View style={{ height: 120 }} />
              </ScrollView>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
        {/* Button absolutely positioned at the bottom */}
        <View style={styles.absoluteButtonContainer}>
          <Button
            title="Buy Airtime"
            onPress={handleConfirm}
            loading={isProcessing}
            disabled={!isFormValid() || isProcessing || isBalanceLoading}
            style={styles.confirmButton}
          />
        </View>
      </View>
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginHorizontal: 10,
    marginVertical: 40,
    maxHeight: '90%',
    flex: 1,
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 0, // Remove extra padding, handled by spacer
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: -20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 5,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamilies.clashDisplay.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 0,
  },
  networkPill: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  networkPillActive: {
    backgroundColor: 'rgba(255, 231, 108, 0.1)',
    borderColor: '#FFE66C',
  },
  networkText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
  },
  amountPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  amountPill: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  amountPillActive: {
    backgroundColor: 'rgba(255, 231, 108, 0.1)',
    borderColor: '#FFE66C',
  },
  amountPillText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
  },
  amountPillTextActive: {
    color: '#FFE66C',
  },
  customAmountPill: {
    backgroundColor: 'rgba(255, 231, 108, 0.1)',
    borderColor: 'rgba(255, 231, 108, 0.3)',
  },
  amountInput: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 62,
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: '#FFFFFF',
    textAlignVertical: 'center',
  },
  amountInputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: fontFamilies.clashDisplay.semibold,
    marginTop: 4,
    marginLeft: 4,
  },
  balanceContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgb(255, 221, 0)',
  },
  balanceKoboText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  absoluteButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 20 : 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
    paddingTop: 20,
    backgroundColor: '#000000',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    minHeight: 80,
    zIndex: 10,
  },
  confirmButton: {
    width: '100%',
  },
});
