import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Alert, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import Button from './Button';
import { Copy, X, Check } from 'lucide-react-native';
import { ExtractedBankData } from '@/services';

interface BankTransferModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmTransfer: () => void;
  onSuccess: () => void;
  amount: string;
  nairaAmount: string;
  extractedData?: ExtractedBankData;
}

export default function BankTransferModal({
  visible,
  onClose,
  onConfirmTransfer,
  onSuccess,
  amount,
  nairaAmount,
  extractedData
}: BankTransferModalProps) {
  const { colors, theme } = useTheme();

  const [slideAnim] = useState(new Animated.Value(0));
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Use extracted data or fallback to default values
  const bankName = extractedData?.bankName || 'PalmPay';
  const accountNumber = extractedData?.accountNumber || '1123456985';
  const accountHolderName = extractedData?.accountHolderName || 'Abdullahi Ogirima Mohammad';
  const extractedAmount = extractedData?.amount || amount;

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

  const handleCopyAmount = () => {
    Alert.alert('Copied', 'Amount copied to clipboard');
  };

  const handleCopyAccountNumber = () => {
    Alert.alert('Copied', 'Account number copied to clipboard');
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleModalPress = (event: any) => {
    event.stopPropagation();
  };

  const handleClosePress = () => {
    Alert.alert(
      'Cancel Transaction',
      'Are you sure you want to cancel this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: onClose,
        },
      ]
    );
  };

  const handleConfirmPress = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onConfirmTransfer();
    }, 1000);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClosePress}
    >
      <View style={styles.overlay}>
        <BlurView intensity={8} style={styles.blurView}>
          <View style={styles.modalContainer}>
            <Animated.View
              style={{
                transform: [{ translateY: slideAnim }]
              }}
            >
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={handleModalPress}
              >
                <View style={styles.header}>
                  <TouchableOpacity onPress={handleClosePress} style={styles.closeButton}>
                    <X size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.headerText}>Transfer to</Text>
                  <View style={styles.spacer} />
                </View>

                <View style={styles.detailsCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.nameValue}>
                      {accountHolderName.includes(' ') 
                        ? accountHolderName.replace(' ', '\n') 
                        : accountHolderName
                      }
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bank Name</Text>
                    <Text style={styles.detailValue}>
                      {bankName}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account number</Text>
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>
                        {accountNumber}
                      </Text>
                      <TouchableOpacity onPress={handleCopyAccountNumber} style={styles.copyButton}>
                        {copied ? (
                          <Check size={20} color="#10B981" />
                        ) : (
                          <Copy size={20} color="rgba(255, 255, 255, 0.6)" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Show extraction confidence if available */}
                  {extractedData && (
                    <View style={styles.confidenceRow}>
                      <Text style={styles.confidenceText}>
                        Extraction confidence: {extractedData.confidence}%
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.warningText}>
                  Please confirm the details before sending.{'\n'}Transfers can't be reversed once completed.
                </Text>

                <View style={styles.buttonContainer}>
                  <Button
                    title="Recheck"
                    variant="secondary"
                    size="lg"
                    onPress={handleClosePress}
                    style={styles.recheckButton}
                    textStyle={styles.recheckButtonText}
                  />
                  
                  <Button
                    title={isLoading ? 'Processing...' : 'Continue'}
                    variant="primary"
                    size="lg"
                    onPress={handleConfirmPress}
                    disabled={isLoading}
                    style={styles.continueButton}
                    textStyle={styles.continueButtonText}
                  />
                </View>

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
  },
  modalContent: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: '50%',
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
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  nameValue: {
    fontSize: 20,
    fontFamily: fontFamilies.sora.bold,
    color: '#F5C842',
    lineHeight: 24,
  },
  detailValue: {
    fontSize: 20,
    fontFamily: fontFamilies.sora.bold,
    color: '#FFFFFF',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyButton: {
    padding: 4,
  },
  confidenceRow: {
    marginTop: 8,
    marginBottom: 0,
  },
  confidenceText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
  },
  warningText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    marginBottom: 32,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  recheckButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    borderWidth: 0,
  },
  recheckButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#A7A7A7',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#F5C842',
    borderRadius: 25,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#000000',
  },
});