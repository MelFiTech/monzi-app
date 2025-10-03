import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AuthStorageService from '@/services/AuthStorageService';
import { fontFamilies } from '@/constants/fonts';
import { PulsatingGlow } from '@/components/common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateLastActivity } from '@/hooks/useInactivityService';
import { BiometricService } from '@/services';
import { useLogout, useProfile } from '@/hooks/useAuthService';

const AVATAR_MALE = require('../../assets/icons/profile/male.png');
const AVATAR_FEMALE = require('../../assets/icons/profile/female.png');

const PasscodeLockScreen = () => {
  const [userName, setUserName] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_MALE);
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const logoutMutation = useLogout();
  const [userInfoAvailable, setUserInfoAvailable] = useState(true);
  const { data: userProfile } = useProfile();

  useEffect(() => {
    const checkUser = async () => {
      const user = await AuthStorageService.getInstance().getUserProfile();
      if (!user?.email) {
        setUserInfoAvailable(false);
        router.replace('/(auth)/login');
        return;
      }
      setFaceIdEnabled(!!user?.email);
      setAvatar(user.gender === 'FEMALE' ? AVATAR_FEMALE : AVATAR_MALE);
    };
    checkUser();
  }, []);

  // Use profile data from backend (same as profile screen)
  useEffect(() => {
    if (userProfile) {
      console.log('🔍 User profile from backend:', { 
        email: userProfile?.email, 
        firstName: userProfile?.firstName, 
        lastName: userProfile?.lastName,
        gender: userProfile?.gender 
      });
      const displayName = userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() + userProfile.firstName.slice(1).toLowerCase() : '';
      setUserName(displayName);
    }
  }, [userProfile]);

  useEffect(() => {
    if (passcode.length === 6) {
      setShowOverlay(true);
      setTimeout(async () => {
        const user = await AuthStorageService.getInstance().getUserProfile();
        if (!user?.email) {
          setShowOverlay(false);
          router.replace('/(auth)/login');
          return;
        }
        await AsyncStorage.setItem('requireReauth', 'false');
        await updateLastActivity();
        setShowOverlay(false);
        router.replace('/(tabs)');
      }, 900);
    }
  }, [passcode]);

  const handleKeyPress = (key: string) => {
    if (key === 'back') {
      setPasscode(passcode.slice(0, -1));
    } else if (passcode.length < 6) {
      setPasscode(passcode + key);
    }
  };

  const handleFaceId = async () => {
    if (!faceIdEnabled) return;
    setShowOverlay(true);
    try {
      const biometricService = BiometricService.getInstance();
      const result = await biometricService.authenticate();
      const user = await AuthStorageService.getInstance().getUserProfile();
      if (result.success && user?.email) {
        await AsyncStorage.setItem('requireReauth', 'false');
        await updateLastActivity();
        setShowOverlay(false);
        router.replace('/(tabs)');
      } else {
        setShowOverlay(false);
        // Stay on passcode-lock screen if biometric fails
        console.log('❌ Biometric authentication failed, staying on passcode-lock screen');
      }
    } catch (e) {
      setShowOverlay(false);
      // Stay on passcode-lock screen if biometric fails
      console.log('❌ Biometric authentication error, staying on passcode-lock screen');
    }
  };

  const handleLogout = async () => {
    setShowOverlay(true);
    try {
      await logoutMutation.mutateAsync({ clearAllData: true });
      setShowOverlay(false);
      router.replace('/(auth)/onboarding');
    } catch (e) {
      setShowOverlay(false);
      router.replace('/(auth)/onboarding');
    }
  };

  const handleForgot = () => {
    router.push('/forgot-passcode');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top icons */}
      <View style={styles.topRow}>
        <TouchableOpacity>
          <Image source={require('../../assets/icons/profile/whatsapp.png')} style={styles.topIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout}>
          <Image source={require('../../assets/icons/auth/logout.png')} style={styles.topIcon} />
        </TouchableOpacity>
      </View>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <Image source={avatar} style={styles.avatar} />
      </View>
      {/* Welcome text */}
      <Text style={styles.welcomeText}>Welcome {userName || ''}</Text>
      <Text style={styles.subtitle}>Enter your passcode</Text>
      {/* Passcode dots */}
      <View style={styles.dotsRow}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[styles.dot, passcode.length > i && styles.dotFilled]}
          />
        ))}
      </View>
      {/* Keypad */}
      <View style={styles.keypad}>
        {['1','2','3','4','5','6','7','8','9','face','0','back'].map((key, i) => (
          <TouchableOpacity
            key={key}
            style={styles.key}
            onPress={() => {
              if (key === 'face') handleFaceId();
              else if (key === 'back') handleKeyPress('back');
              else handleKeyPress(key);
            }}
          >
            {key === 'face' ? (
              <Image source={require('../../assets/icons/profile/face-id.png')} style={styles.faceIcon} />
            ) : key === 'back' ? (
              <Image source={require('../../assets/icons/home/send/backspace.png')} style={styles.backIcon} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      {/* Forgot passcode */}
      <TouchableOpacity onPress={handleForgot} style={styles.forgotContainer}>
        <Text style={styles.forgotText}>Forgot Your Passcode?</Text>
      </TouchableOpacity>

      {/* Loading Overlay */}
      {showOverlay && (
        <View style={styles.overlay}>
          <PulsatingGlow />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    marginTop: 16,
    marginBottom: 24,
  },
  topIcon: {
    width: 28,
    height: 28,
    tintColor: '#fff',
    opacity: 0.7,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: fontFamilies.sora.bold,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 80,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#222',
    backgroundColor: 'transparent',
    marginHorizontal: 6,
  },
  dotFilled: {
    backgroundColor: '#FFE66C',
    borderColor: '#FFE66C',
  },
  keypad: {
    width: '90%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: -34,
    marginTop: 64,
  },
  key: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: '1.5%',
    borderRadius: 32,
  },
  keyText: {
    color: '#fff',
    fontSize: 28,
    fontFamily: fontFamilies.sora.medium,
  },
  faceIcon: {
    width: 32,
    height: 32,
    tintColor: '#fff',
    opacity: 0.8,
  },
  backIcon: {
    width: 32,
    height: 32,
    tintColor: '#fff',
    opacity: 0.8,
  },
  forgotContainer: {
    marginTop: -92,
  },
  forgotText: {
    color: '#FFD600',
    fontSize: 16,
    fontFamily: fontFamilies.sora.semiBold,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default PasscodeLockScreen;