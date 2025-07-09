import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { fontFamilies } from '@/constants/fonts';
import { ArrowLeft, User, Copy, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from '@/components/common/Toast';

interface CameraHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  walletBalance?: string;
  accountInfo?: string;
}

export function CameraHeader({ 
  title = "Snap & Go", 
  showBackButton = false, 
  onBackPress,
  walletBalance = "N256,311.12",
  accountInfo = "Polaris • 0260835212"
}: CameraHeaderProps) {
  const { colors } = useTheme();
  const { logout, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleAddPress = () => {
    router.push('/amount');
  };

  const handleProfilePress = () => {
    // Navigate to profile modal
    router.push('/modal');
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleCopyAccount = () => {
    setShowToast(true);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const toggleBalanceVisibility = () => {
    setIsBalanceHidden(!isBalanceHidden);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Toast
        visible={showToast}
        message="Account number copied"
        type="success"
        onHide={() => setShowToast(false)}
      />
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.95)', 'rgba(0, 0, 0, 0.60)', 'rgba(0, 0, 0, 0)']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Left Circle */}
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity style={styles.iconButton} onPress={handleBackPress}>
              <ArrowLeft size={20} color={colors.white} strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.iconButton} onPress={handleProfilePress}>
              <View style={[styles.profileAvatar, {  backgroundColor: 'rgba(0, 0, 0, 0.28)' }]}>
                <Image 
                  source={require('@/assets/icons/home/monzi.png')}
                  style={{width: 23, height: 13}}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Center Section */}
        <View style={styles.centerSection}>
          <View style={styles.walletInfoContainer}>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <TouchableOpacity onPress={toggleBalanceVisibility}>
              <Text style={styles.walletAmount}>
                {isBalanceHidden ? '********' : walletBalance}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.accountPill}
              onPress={handleCopyAccount}
              activeOpacity={0.7}
            >
              <Text style={styles.accountText}>{accountInfo}</Text>
              {copied ? (
                <Check size={16} color="#10B981" strokeWidth={1.5} />
              ) : (
                <Copy size={16} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Circle */}
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton} onPress={handleAddPress}>
            <Image 
              source={require('@/assets/icons/home/menu.png')}
              style={{width: 18, height: 10}}
              tintColor={colors.white}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
    zIndex: 200,
  },
  leftSection: {
    width: 60,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 200,
    justifyContent: 'flex-end',
  },
  walletInfoContainer: {
    alignItems: 'center',
    marginBottom: 70,
  },
  rightSection: {
    width: 60,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: fontFamilies.sora.medium,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  walletAmount: {
    fontSize: 32,
    color: '#FFFFFF',
    fontFamily: fontFamilies.clashDisplay.bold,
    fontWeight: '700',
    marginBottom: 16,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.29)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  accountText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.97)',
    fontFamily: fontFamilies.sora.semiBold,
    letterSpacing: -0.3,
  },
  copyButton: {
    padding: 4,
  },
});

export default CameraHeader;