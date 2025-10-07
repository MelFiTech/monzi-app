import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  Image,
  ImageBackground,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';
import { useAuth } from '@/hooks/useAuthService';
import { ProfileMenuItem, ProfileHeader } from '@/components/profile';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, logout, authStatus, biometricSettings } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(authStatus?.biometricEnabled || false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const handleClose = () => {
    router.back();
  };

  // Check biometric availability on component mount
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      const isAvailable = await biometricSettings.checkBiometricAvailability();
      setBiometricAvailable(isAvailable);
    };
    
    checkBiometricAvailability();
  }, []);

  // Update local state when auth status changes
  useEffect(() => {
    if (authStatus?.biometricEnabled !== undefined) {
      setBiometricEnabled(authStatus.biometricEnabled);
    }
  }, [authStatus?.biometricEnabled]);

  const handleBiometricToggle = async (value: boolean) => {
    if (!biometricAvailable && value) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Please ensure your device has biometric authentication set up and enabled in device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      if (value) {
        // Get biometric type for better UX
        const biometricTypes = await biometricSettings.getBiometricType();
        const biometricType = biometricTypes[0] || 'biometric authentication';
        
        Alert.alert(
          'Enable Biometric Authentication',
          `Do you want to enable ${biometricType} for faster transactions?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Enable',
              onPress: async () => {
                setBiometricEnabled(true);
                biometricSettings.setBiometricEnabled.mutate(true);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Disable Biometric Authentication',
          'You will need to use your passcode for future transactions. Are you sure?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: () => {
                setBiometricEnabled(false);
                biometricSettings.setBiometricEnabled.mutate(false);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error toggling biometric setting:', error);
      Alert.alert(
        'Error',
        'Failed to update biometric settings. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSecurityPress = () => {
    router.push('/security-new');
  };

  const handleAboutPress = () => {
    router.push('/modal');
  };

  const handleSupportPress = async () => {
    const twitterUrl = 'https://x.com/monzimoney?s=21&t=0PIruWnjHvaTf7Y3zXT0cA';
    
    try {
      const supported = await Linking.canOpenURL(twitterUrl);
      
      if (supported) {
        await Linking.openURL(twitterUrl);
      } else {
        Alert.alert(
          'Cannot Open Twitter',
          'Twitter app is not installed on your device. Please install Twitter to contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening Twitter:', error);
      Alert.alert(
        'Error',
        'Failed to open Twitter. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Show loading state if needed
              await logout.mutateAsync({ clearAllData: false });
              
              // Navigate to login screen after successful logout
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              // Navigate to login screen even if logout fails
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format user name with proper capitalization
  const userName = user?.firstName && user?.lastName 
    ? capitalizeWords(`${user.firstName} ${user.lastName}`)
    : user?.firstName || '';

  const userEmail = user?.email || 'user@example.com';
  const userPhone = user?.phone || '+234XXXXXXXXXX';

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        source={require('../assets/images/profile-bg.png')}
        style={styles.container}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <ProfileHeader onClose={handleClose} />

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Image
                  source={
                    user?.gender === 'FEMALE'
                      ? require('../assets/icons/profile/female.png')
                      : require('../assets/icons/profile/male.png')
                  }
                  style={styles.avatarImage}
                />
              </View>
            </View>
            
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>
            <Text style={styles.userPhone}>{userPhone}</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {/* Group 1: Main Settings */}
            <View style={styles.menuGroup}>
                          <ProfileMenuItem
              title="Biometrics"
              subtitle={biometricAvailable ? "Transact faster" : "Not available on this device"}
              icon={require('../assets/icons/profile/face-id.png')}
              variant="toggle"
              toggleValue={biometricEnabled}
              onToggle={handleBiometricToggle}
              disabled={!biometricAvailable || biometricSettings.setBiometricEnabled.isPending}
            />

              <ProfileMenuItem
                title="Security & Privacy"
                subtitle="Passcode & transaction pin"
                icon={require('../assets/icons/profile/shield.png')}
                variant="default"
                onPress={handleSecurityPress}
              />

              <ProfileMenuItem
                title="About Monzi"
                subtitle="Learn more about Monzi"
                icon={require('../assets/icons/profile/monzo.png')}
                variant="default"
                onPress={handleAboutPress}
                isMonzoIcon={true}
              />
            </View>

            {/* Group 2: Support & Account */}
            <View style={styles.menuGroup}>
              <ProfileMenuItem
                title="Support"
                subtitle="Talk to us"
                icon={require('../assets/icons/profile/whatsapp.png')}
                variant="default"
                onPress={handleSupportPress}
              />

              <ProfileMenuItem
                title="Sign Out"
                icon={require('../assets/icons/profile/logout.png')}
                variant="default"
                onPress={handleSignOut}
              />
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: fontFamilies.clashDisplay.semibold,
    fontWeight: '600',
    marginBottom: 8,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    marginBottom: 4,
  },
  userPhone: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 40,
  },
  menuGroup: {
    gap: 0,
  },
});