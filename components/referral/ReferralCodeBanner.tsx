import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { fontFamilies } from '@/constants/fonts';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

interface ReferralCodeBannerProps {
  referralCode: string;
}

export default function ReferralCodeBanner({ referralCode }: ReferralCodeBannerProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(referralCode);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error copying referral code:', error);
      Alert.alert('Error', 'Failed to copy referral code');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Referral Code</Text>
      <View style={styles.banner}>
        <Text style={styles.codeLabel}>Referral Code</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeValue}>{referralCode}</Text>
          <TouchableOpacity style={styles.copyIconContainer} onPress={handleCopyCode}>
            <FontAwesome 
              name={isCopied ? "check" : "copy"} 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.instructionText}>
        Share this code with friends to earn ₦500 for each successful referral
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
    alignSelf: 'flex-start',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'left',
  },
  banner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
    width: '100%',
  },
  codeLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    textAlign: 'left',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    justifyContent: 'flex-start',
  },
  codeValue: {
    fontSize: 32,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFE66C',
    letterSpacing: 4,
    textAlign: 'left',
  },
  copyIconContainer: {
    marginLeft: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'left',
    marginTop: 12,
    lineHeight: 16,
  },
});
