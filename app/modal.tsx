import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Image,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { fontFamilies } from '@/constants/fonts';
import { Gyroscope } from 'expo-sensors';

export default function ModalScreen() {
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const glowX = new Animated.Value(0);
  const glowY = new Animated.Value(0);
  const glowScale = new Animated.Value(1);

  useEffect(() => {
    // Start pulsating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    let subscription: any;

    const startGyroscope = async () => {
      try {
        // Check if gyroscope is available
        const isAvailable = await Gyroscope.isAvailableAsync();
        if (!isAvailable) {
          console.log('Gyroscope not available');
          return;
        }

        // Set update interval (60fps for smooth movement)
        Gyroscope.setUpdateInterval(16);

        subscription = Gyroscope.addListener((data) => {
          setGyroData(data);
          
          // Create smooth animated movement based on gyroscope data
          const moveX = data.y * 1090; // Use Y axis for X movement (tilt left/right)
          const moveY = data.x * 1090; // Use X axis for Y movement (tilt forward/back)
          
          Animated.parallel([
            Animated.timing(glowX, {
              toValue: moveX,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(glowY, {
              toValue: moveY,
              duration: 600,
              useNativeDriver: true,
            }),
          ]).start();
        });
      } catch (error) {
        console.log('Error starting gyroscope:', error);
      }
    };

    startGyroscope();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const handleClose = () => {
    router.back();
  };

  const handlePrivacyPolicy = () => {
    // TODO: Open privacy policy URL
    console.log('Privacy Policy pressed');
  };

  const handleReviewApp = () => {
    // TODO: Open app store review
    console.log('Review the app pressed');
  };

  const handleSocialMediaPress = () => {
    Linking.openURL('https://www.instagram.com/monzimoney/?utm_source=ig_web_button_share_sheet');
  };

  return (
    <ImageBackground
      source={require('@/assets/images/about/about-bg.png')}
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
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Animated.Image
              source={require('@/assets/icons/profile/about/glow.png')}
              style={[
                styles.glow,
                {
                  transform: [
                    { translateX: glowX },
                    { translateY: glowY },
                    { scale: glowScale },
                  ],
                },
              ]}
            />
          </View>

          {/* Text Content */}
          <View style={styles.textContent}>
            <Text style={styles.mainTitle}>Built by Two,</Text>
            <Text style={styles.mainTitle}>Made for Many.</Text>
            
            <Text style={styles.description}>
              We hated typing account numbers, like, really hated it. So we built Monzi. Snap & send money in seconds. No typing, no typos, no long talk.
            </Text>

            <TouchableOpacity onPress={handleSocialMediaPress}>
              <Text style={styles.socialHandle}>
                <Text style={styles.followText}>Follow our journey </Text>
                <Text style={styles.handleText}>@monzimoney</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Links */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={handlePrivacyPolicy}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity onPress={handleReviewApp}>
            <Text style={styles.linkText}>Review the app</Text>
          </TouchableOpacity>
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
    paddingTop: -10,
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
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 80,
    position: 'relative',
  },
  glow: {
    width: 580,
    height: 580,
    position: 'absolute',
    marginTop: 250,
    marginBottom: 100,
  },
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 280,
  },
  mainTitle: {
    fontSize: 32,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 38,
  },
  description: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.light,
    color: 'rgba(255, 255, 255, 0.52)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 32,
  },
  socialHandle: {
    fontSize: 14,
    textAlign: 'center',
  },
  followText: {
    fontFamily: fontFamilies.sora.light,
    color: '#959595',
  },
  handleText: {
    fontFamily: fontFamilies.sora.bold,
    color: '#959595',
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  linkText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: '#A7A7A7',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    marginHorizontal: 20,
  },
});
