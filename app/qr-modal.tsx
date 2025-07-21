import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { fontFamilies } from '@/constants/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { useWalletDetails } from '@/hooks/useWalletService';
import { BlurView } from 'expo-blur';

const QR_CACHE_KEY = 'monzi.qr.accountNumber';

export default function QrModalScreen() {
  const { data: walletDetails } = useWalletDetails();
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadQr = async () => {
      // Try to get from cache
      const cached = await AsyncStorage.getItem(QR_CACHE_KEY);
      if (cached) {
        setAccountNumber(cached);
        setIsReady(true);
        return;
      }
      // If not cached, get from walletDetails
      if (walletDetails?.virtualAccountNumber) {
        setAccountNumber(walletDetails.virtualAccountNumber);
        await AsyncStorage.setItem(QR_CACHE_KEY, walletDetails.virtualAccountNumber);
        setIsReady(true);
      }
    };
    loadQr();
  }, [walletDetails]);

  const handleClose = () => {
    router.back();
  };

  return (
    <ImageBackground
      source={require('@/assets/images/profile-bg.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <View style={styles.indicator} />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* QR Code Section */}
          <View style={styles.qrContainer}>
            <Text style={styles.comingSoon}>This feature is coming soon</Text>
            <BlurView intensity={100} tint="light" style={styles.blurContainer}>
              {isReady && accountNumber ? (
                <QRCode
                  value={accountNumber}
                  size={200}
                  color="#000"
                  backgroundColor="#FFE66C"
                  logo={require('@/assets/icons/home/monzi-black.png')}
                  logoSize={50}
                  logoBackgroundColor="transparent"
                  logoMargin={4}
                  ecl="H"
                />
              ) : (
                <View style={styles.qrPlaceholder} />
              )}
            </BlurView>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.description}>
            Use Monzi to scan this QR code and{'\n'}receive money in less that a second
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginTop: -100,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 190,
  },
  comingSoon: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  qrPlaceholder: {
    width: 280,
    height: 280,
    backgroundColor: '#222',
    borderRadius: 16,
  },
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  description: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 