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
import DataPlanDropdown from '@/components/common/DataPlanDropdown';
import TransactionPinModal from '@/components/common/TransactionPinModal';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { BillsService, DataPlan as ApiDataPlan, DataPurchaseRequest } from '@/services';
import { useWalletBalance } from '@/hooks/useWalletService';
import ToastService from '@/services/ToastService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Network {
  id: string;
  name: string;
  code: string;
}

interface DataPlan {
  bundle_id: string;
  amount: string;
  data_bundle: string;
  validity: string;
}

const networks: Network[] = [
  { id: 'mtn', name: 'MTN', code: 'MTN' },
  { id: 'glo', name: 'GLO', code: 'GLO' },
  { id: 'airtel', name: 'Airtel', code: 'AIRTEL' },
  { id: '9mobile', name: '9mobile', code: '9MOBILE' },
];

export default function DataModalScreen() {
  const { colors } = useTheme();
  const { authToken } = useAuth();
  const { data: walletBalance, isLoading: isBalanceLoading } = useWalletBalance();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rawPhoneNumber, setRawPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<DataPlan[]>([]);
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    phoneNumber?: string;
    network?: string;
    plan?: string;
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

  // Load plans when network is selected
  useEffect(() => {
    const loadPlans = async () => {
      if (selectedNetwork && authToken) {
        try {
          const plans = await BillsService.getDataPlansByNetwork(selectedNetwork.code, authToken);
          setAvailablePlans(plans);
          setSelectedPlan(null);
        } catch (error) {
          console.error('Error loading data plans:', error);
          ToastService.error('Failed to load data plans');
          setAvailablePlans([]);
        }
      } else {
        setAvailablePlans([]);
      }
    };

    loadPlans();
  }, [selectedNetwork, authToken]);

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

    // Validate plan
    if (!selectedPlan) {
      newErrors.plan = 'Please select a data plan';
    } else if (walletBalance && selectedPlan && parseInt(selectedPlan.amount) > walletBalance.balance) {
      newErrors.plan = 'Insufficient balance for this plan';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    return rawPhoneNumber.trim() &&
           /^0[789][01]\d{8}$/.test(rawPhoneNumber) &&
           selectedNetwork &&
           selectedPlan &&
           (!walletBalance || parseInt(selectedPlan.amount) <= walletBalance.balance);
  };

  const handleConfirm = async () => {
    if (!validateForm() || !selectedPlan || !authToken) {
      return;
    }

    // Double-check balance before proceeding
    if (walletBalance && parseInt(selectedPlan.amount) > walletBalance.balance) {
      ToastService.error('Insufficient balance for this data plan');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPinModal(true);
  };

  const handlePinConfirm = async (pin: string) => {
    if (!authToken || !selectedPlan) {
      setShowPinModal(false);
      return;
    }

    setIsProcessing(true);
    setPinError(null);
    
    try {
      const request: DataPurchaseRequest = {
        phoneNumber: rawPhoneNumber,
        bundleId: selectedPlan.bundle_id,
        amount: parseInt(selectedPlan.amount),
        pin: pin,
        network: selectedNetwork!.code
      };

      const response = await BillsService.purchaseData(request, authToken);
      
      if (response.success) {
        setShowPinModal(false);
        // Navigate to bill success screen
        router.push({
          pathname: '/bill-success',
          params: {
            amount: selectedPlan.amount,
            phoneNumber: rawPhoneNumber,
            network: selectedNetwork!.code,
            planName: selectedPlan.data_bundle,
            reference: response.reference,
            billType: 'data',
          }
        });
      } else {
        setPinError('Data purchase failed. Please try again.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Data purchase error:', error);
      setPinError('Failed to purchase data. Please try again.');
      setIsProcessing(false);
    }
  };

  const handlePinModalClose = () => {
    setShowPinModal(false);
    setPinError(null);
    setIsProcessing(false);
  };

  const handleNetworkSelect = (network: Network) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNetwork(network);
    setErrors(prev => ({ ...prev, network: undefined }));
  };

  const handlePlanSelect = (plan: DataPlan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
    setShowPlanDropdown(false);
    setErrors(prev => ({ ...prev, plan: undefined }));
  };

  const handlePlanDropdownToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPlanDropdown(!showPlanDropdown);
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
                <Text style={styles.title}>Buy Data</Text>
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

                 {/* Data Plans Selection */}
                 <View style={styles.inputGroup}>
                   <Text style={styles.label}>Select Data Plan</Text>
                   <DataPlanDropdown
                     plans={availablePlans}
                     selectedPlan={selectedPlan}
                     onPlanSelect={handlePlanSelect}
                     isOpen={showPlanDropdown}
                     onToggle={selectedNetwork ? handlePlanDropdownToggle : () => {}}
                     error={errors.plan}
                     placeholder={selectedNetwork ? "Select a data plan" : "Select a network first"}
                     disabled={!selectedNetwork}
                   />
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
            title="Buy Data"
            onPress={handleConfirm}
            loading={isProcessing}
            disabled={!isFormValid() || isProcessing || isBalanceLoading}
            style={styles.confirmButton}
          />
        </View>
      </View>

      {/* Transaction Pin Modal */}
      <TransactionPinModal
        visible={showPinModal}
        onClose={handlePinModalClose}
        onConfirm={handlePinConfirm}
        recipientName={`${selectedNetwork?.name} Data`}
        accountNumber={rawPhoneNumber}
        bankName="Data Purchase"
        amount={selectedPlan?.amount || '0'}
        pinError={pinError || undefined}
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginHorizontal: 10,
    marginVertical: 20,
    maxHeight: '100%',
    flex: 1,
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: -0, // Remove extra padding, handled by spacer
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
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
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
