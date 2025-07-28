import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Share,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamilies } from '@/constants/fonts';
import { Check } from 'lucide-react-native';
import { useTagTransaction } from '@/hooks/useWalletService';
import ToastService from '@/services/ToastService';

export default function TransferSuccessScreen() {
  const params = useLocalSearchParams();
  
  // Extract transfer details from params
  const amount = params.amount as string || '0';
  const recipientName = (params.recipientName as string || '').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const reference = params.reference as string || '';
  const newBalance = params.newBalance as string || '';
  const transactionId = params.transactionId as string || '';
  const transferSource = params.transferSource as string || ''; // Track transfer source

  // Tag transaction state
  const [isBusiness, setIsBusiness] = useState(false);
  const tagTransactionMutation = useTagTransaction();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animation when component mounts
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handleDone = () => {
    // Navigate back to home screen
    router.replace('/(tabs)');
  };

  const handleShare = async () => {
    try {
      const message = `Transfer Receipt\n\nAmount: ₦${amount}\nRecipient: ${recipientName}\nReference: ${reference}`;
      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  const handleTagToggle = async (value: boolean) => {
    if (!transactionId) {
      ToastService.error('Transaction ID not available');
      return;
    }

    try {
      await tagTransactionMutation.mutateAsync({
        transactionId,
        isBusiness: value,
      });
      
      setIsBusiness(value);
      ToastService.success(value ? 'Marked as business' : 'Marked as personal');
    } catch (error) {
      console.error('Error tagging transaction:', error);
      ToastService.error('Failed to tag transaction');
      // Revert the toggle if it fails
      setIsBusiness(!value);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Animated.View 
            style={[
              styles.checkmarkCircle,
              {
                transform: [
                  { scale: scaleAnim },
                  { rotate: spin }
                ],
                opacity: opacityAnim,
              }
            ]}
          >
            <Text style={styles.checkmark}>✓</Text>
          </Animated.View>
        </View>

        {/* Success Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.successText}>
            You sent ₦{amount} to
          </Text>
          <Text numberOfLines={2} ellipsizeMode="tail" style={styles.recipientText}>
            {recipientName}
          </Text>
        </View>

        {/* Transaction Tag Toggle - Show for image extraction and manual entry */}
        {transactionId && (transferSource === 'image_extraction' || transferSource === 'manual_entry') && (
          <View style={styles.tagContainer}>
            <Text style={styles.tagLabel}>Mark as business transaction</Text>
            <Switch
              value={isBusiness}
              onValueChange={handleTagToggle}
              trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#FFE66C' }}
              thumbColor={isBusiness ? '#000000' : '#FFFFFF'}
              disabled={tagTransactionMutation.isPending}
            />
          </View>
        )}
      </View>

      {/* Share and Done Buttons */}
      <View style={styles.buttonContainer}>
        {/* <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share receipt</Text>
        </TouchableOpacity> */}
        
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFE66C',
    backgroundColor: 'transparent',
  },
  checkmark: {
    fontSize: 32,
    fontFamily: fontFamilies.sora.bold,
    fontWeight: '700',
    color: '#FFE66C',
  },
  messageContainer: {
    alignItems: 'center',
  },
  successText: {
    fontSize: 28,
    fontFamily: fontFamilies.clashDisplay.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 2,
  },
  recipientText: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.regular,
    color: '#525252',
    textAlign: 'center',
    lineHeight: 36,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: -10,
    paddingTop: 10,
    gap: 12,
  },
  shareButton: {
    backgroundColor: 'transparent',
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE66C',
  },
  shareButtonText: {
    color: '#FFE66C',
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#FFE66C',
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  doneButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    fontWeight: '600',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 62,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 44,
    marginHorizontal: 20,
  },
  tagLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
    marginRight: 12,
  },
}); 