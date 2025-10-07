import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { AuthHeader } from '@/components/auth';

export default function SecurityNewScreen() {
  const { colors } = useTheme();

  const handleClose = () => {
    try {
      router.back();
    } catch (error) {
      console.error('Error navigating back from security screen:', error);
      router.replace('/(tabs)');
    }
  };

  const handleChangeTransactionPIN = () => {
    try {
      router.push('/change-pin');
    } catch (error) {
      console.error('Error navigating to change-pin:', error);
      Alert.alert('Navigation Error', 'Unable to open PIN settings. Please try again.');
    }
  };

  const handleChangePassword = () => {
    try {
      router.push('/change-passcode');
    } catch (error) {
      console.error('Error navigating to change-passcode:', error);
      Alert.alert('Navigation Error', 'Unable to open passcode settings. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    try {
      router.push('/delete-account');
    } catch (error) {
      console.error('Error navigating to delete-account:', error);
      Alert.alert('Navigation Error', 'Unable to open account deletion. Please try again.');
    }
  };

  const SecurityOption = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    isDestructive = false 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress: () => void;
    isDestructive?: boolean;
  }) => {
    const handlePress = () => {
      try {
        onPress();
      } catch (error) {
        console.error('Error in SecurityOption press:', error);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    };

    return (
      <TouchableOpacity 
        style={styles.optionContainer} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.optionContent}>
          <View style={[styles.iconContainer, isDestructive && styles.destructiveIcon]}>
            <Image 
              source={icon}
              style={[styles.iconImage, isDestructive && styles.destructiveIconImage]}
              resizeMode="contain"
              onError={(error) => {
                console.warn('Failed to load security icon:', error);
              }}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.optionTitle, isDestructive && styles.destructiveText]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.optionSubtitle}>{subtitle}</Text>
            )}
          </View>
          <View style={styles.chevronContainer}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <AuthHeader variant="back" onBack={handleClose} />
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Security</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <SecurityOption
            icon={require('../assets/icons/security/pin.png')}
            title="Change Transaction PIN"
            subtitle="You use this PIN for transactions"
            onPress={handleChangeTransactionPIN}
          />

          <SecurityOption
            icon={require('../assets/icons/security/lock.png')}
            title="Change Passcode"
            subtitle="You use this passcode to log in"
            onPress={handleChangePassword}
          />

          <SecurityOption
            icon={require('../assets/icons/security/trash-icon.png')}
            title="Delete Account"
            onPress={handleDeleteAccount}
            isDestructive={true}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  titleContainer: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'left',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  optionContainer: {
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 22,
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  destructiveIcon: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  iconImage: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  destructiveIconImage: {
    tintColor: '#FF3B30',
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  destructiveText: {
    color: '#FF3B30',
  },
  optionSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  chevronContainer: {
    width: 24,
    alignItems: 'center',
  },
  chevron: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '300',
  },
});

