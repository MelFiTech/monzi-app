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
import { useTheme } from '../providers/ThemeProvider';
import { fontFamilies, fontSizes } from '../constants/fonts';

export default function SecurityModal() {
  const { colors } = useTheme();

  const handleClose = () => {
    router.back();
  };

  const handleChangeTransactionPIN = () => {
    router.dismissAll();
    router.push('/change-pin');
  };

  const handleChangePassword = () => {
    router.dismissAll();
    router.push('/change-passcode');
  };

  const handleDeleteAccount = () => {
    router.dismissAll();
    router.push('/delete-account');
  };

  const SecurityOption = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    isDestructive = false 
  }: {
    icon: any; // Image source
    title: string;
    subtitle?: string;
    onPress: () => void;
    isDestructive?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.optionContainer} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionContent}>
        <View style={[styles.iconContainer, isDestructive && styles.destructiveIcon]}>
          <Image 
            source={icon}
            style={[styles.iconImage, isDestructive && styles.destructiveIconImage]}
            resizeMode="contain"
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

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.indicator} />
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
            icon={require('../assets/icons/security/delete-icon.png')}
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
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden'
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginBottom: 20,
  },
  title: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  optionContainer: {
    marginBottom: 8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
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