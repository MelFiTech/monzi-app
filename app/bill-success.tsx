import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamilies } from '@/constants/fonts';
import { FontAwesome } from '@expo/vector-icons';

export default function BillSuccessScreen() {
  const params = useLocalSearchParams();
  
  // Extract bill details from params
  const amount = params.amount as string || '0';
  const phoneNumber = params.phoneNumber as string || '';
  const network = params.network as string || '';
  const planName = params.planName as string || '';
  const billType = params.billType as string || 'airtime'; // 'airtime' or 'data'
  const newBalance = params.newBalance as string || '';

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
    // Close all modals and return to home
    router.dismissAll();
    router.replace('/(tabs)');
  };

  const getSuccessMessage = () => {
    if (billType === 'airtime') {
      return `You purchased ₦${amount} airtime for`;
    } else {
      return `You purchased ${planName} data for`;
    }
  };

  const getRecipientText = () => {
    return `${phoneNumber} (${network})`;
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
            <FontAwesome 
              name="check" 
              size={32} 
              color="#FFE66C" 
            />
          </Animated.View>
        </View>

        {/* Success Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.successText}>
            {getSuccessMessage()}
          </Text>
          <Text numberOfLines={2} ellipsizeMode="tail" style={styles.recipientText}>
            {getRecipientText()}
          </Text>
          {billType === 'data' && planName && (
            <Text style={styles.planText}>
              {planName} • ₦{amount}
            </Text>
          )}
        </View>
      </View>

      {/* Done Button */}
      <View style={styles.buttonContainer}>
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
  messageContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
  planText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFE66C',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    gap: 12,
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
});
