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
import { useAuth } from '@/hooks/useAuthService';
import { fontFamilies } from '@/constants/fonts';
import { useWalletBalance, useWalletDetails, useWalletAccessStatus } from '@/hooks';
import { useNotificationService } from '@/hooks/useNotificationService';
import { ArrowLeft, User, Copy, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import Toast from '@/components/common/Toast';
import { useQueryClient } from '@tanstack/react-query';

interface CameraHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  walletBalance?: string;
  accountInfo?: string;
}

// Utility function to format balance
const formatBalance = (balance: string): string => {
  // Remove currency symbol and commas to get the number
  const numericValue = parseFloat(balance.replace(/[₦,]/g, ''));
  
  if (isNaN(numericValue)) return balance;
  
  if (numericValue >= 1000000) {
    // For millions: show exact value with minimal decimal places
    const millions = numericValue / 1000000;
    
    // If it's a whole number, show as whole
    if (millions % 1 === 0) {
      return `₦${Math.round(millions)}M`;
    }
    
    // Otherwise, show with minimal decimal places needed (up to 3)
    // Remove trailing zeros
    let formattedMillions = millions.toFixed(3);
    formattedMillions = parseFloat(formattedMillions).toString();
    
    return `₦${formattedMillions}M`;
  } else if (numericValue >= 100000) {
    // For thousands: only show K for amounts 100,000 and above
    const thousands = Math.floor(numericValue / 1000);
    return `₦${thousands}K`;
  } else {
    return balance;
  }
};

export function CameraHeader({ 
  title = "Snap & Go", 
  showBackButton = false, 
  onBackPress,
  walletBalance: propWalletBalance,
  accountInfo: propAccountInfo
}: CameraHeaderProps) {
  const { colors } = useTheme();
  const { logout, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const queryClient = useQueryClient();

  // Check wallet access status
  const { hasWalletAccess, statusMessage } = useWalletAccessStatus();

  // Fetch wallet data only if user has access
  const { data: balanceData } = useWalletBalance();
  const { data: walletDetails } = useWalletDetails();

  // Real-time notifications for wallet updates
  const { 
    isConnected: isNotificationConnected,
    lastWalletUpdate,
    formatAmount: formatNotificationAmount
  } = useNotificationService(
    {
      autoConnect: true,
      showToasts: true,
      enableBalanceUpdates: true,
      enableTransactionNotifications: true,
      enableGeneralNotifications: true,
    },
    {
      onWalletBalanceUpdate: (notification) => {
        console.log('🔔 [CameraHeader] Real-time wallet update received:', {
          component: 'CameraHeader',
          timestamp: new Date().toISOString(),
          eventType: 'wallet_balance_updated',
          fullNotification: notification,
          balanceChange: {
            oldBalance: formatNotificationAmount(notification.data.oldBalance),
            newBalance: formatNotificationAmount(notification.data.newBalance),
            changeAmount: formatNotificationAmount(notification.data.amount),
            isCredit: notification.data.amount > 0,
            isDebit: notification.data.amount < 0,
          },
          transaction: {
            reference: notification.data.transactionReference,
            accountNumber: notification.data.accountNumber,
            description: notification.data.description,
            timestamp: notification.data.timestamp,
          }
        });
        
        // Log balance comparison
        if (notification.data.amount > 0) {
          console.log(`💰 [CameraHeader] WALLET CREDITED: +${formatNotificationAmount(notification.data.amount)} | New Balance: ${formatNotificationAmount(notification.data.newBalance)}`);
        } else if (notification.data.amount < 0) {
          console.log(`💸 [CameraHeader] WALLET DEBITED: ${formatNotificationAmount(notification.data.amount)} | New Balance: ${formatNotificationAmount(notification.data.newBalance)}`);
        }
        
        // Invalidate wallet queries to refresh balance display
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
        queryClient.invalidateQueries({ queryKey: ['wallet', 'details'] });
        queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
        
        console.log('🔄 [CameraHeader] React Query cache invalidated for wallet data');
      },
      onTransactionNotification: (notification) => {
        console.log('💳 [CameraHeader] Real-time transaction notification received:', {
          component: 'CameraHeader',
          timestamp: new Date().toISOString(),
          eventType: 'transaction_notification',
          fullNotification: notification,
          transaction: {
            type: notification.data.type,
            amount: formatNotificationAmount(notification.data.amount),
            reference: notification.data.transactionReference,
            accountNumber: notification.data.accountNumber,
            description: notification.data.description,
            status: notification.data.status,
            timestamp: notification.data.timestamp,
          }
        });
        
        console.log(`💳 [CameraHeader] TRANSACTION ${notification.data.type.toUpperCase()}: ${formatNotificationAmount(notification.data.amount)} | Status: ${notification.data.status}`);
        
        // Refresh wallet data for any transaction
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        
        console.log('🔄 [CameraHeader] React Query cache invalidated for all wallet data');
      },
      onConnect: () => {
        console.log('🔌 [CameraHeader] Real-time notifications connected:', {
          component: 'CameraHeader',
          timestamp: new Date().toISOString(),
          event: 'connected',
          message: 'Successfully connected to Socket.IO notifications server'
        });
      },
      onError: (error) => {
        console.error('❌ [CameraHeader] Real-time notification error:', {
          component: 'CameraHeader',
          timestamp: new Date().toISOString(),
          event: 'error',
          error: error,
          errorMessage: error?.message || 'Unknown error',
          errorType: typeof error
        });
      }
    }
  );

  // Handle wallet data based on access status
  const getWalletBalance = () => {
    if (!hasWalletAccess) {
      return propWalletBalance || "₦0.00";
    }
    return balanceData?.formattedBalance || propWalletBalance || "₦0.00";
  };

  const getAccountInfo = () => {
    if (!hasWalletAccess) {
      return propAccountInfo || "No account yet";
    }
    return walletDetails 
      ? `${walletDetails.bankName} • ${walletDetails.virtualAccountNumber}`
      : propAccountInfo || "Loading...";
  };

  const rawBalance = getWalletBalance();
  const walletBalance = formatBalance(rawBalance);
  const accountInfo = getAccountInfo();

  const handleAddPress = () => {
    router.push('/profile');
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

  const handleCopyAccount = async () => {
    try {
      // Only allow copying if user has wallet access
      if (!hasWalletAccess) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        return;
      }

      const accountNumber = walletDetails?.virtualAccountNumber || '';
      if (accountNumber) {
        Clipboard.setString(accountNumber);
        setShowToast(true);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      }
    } catch (error) {
      console.warn('Failed to copy account number:', error);
      // Show toast anyway for feedback
      setShowToast(true);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const toggleBalanceVisibility = () => {
    setIsBalanceHidden(!isBalanceHidden);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Toast
        visible={showToast}
        message={`${walletDetails?.virtualAccountNumber || 'Account number'} copied`}
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
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
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
            <View style={styles.walletLabelContainer}>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              {/* Real-time status indicator */}
              {hasWalletAccess && (
                <View style={[styles.statusIndicator, { 
                  backgroundColor: isNotificationConnected ? '#10B981' : 'rgba(255, 255, 255, 0.3)' 
                }]} />
              )}
            </View>
            <TouchableOpacity onPress={toggleBalanceVisibility}>
              {isBalanceHidden ? (
                <Text style={styles.walletAmount}>********</Text>
              ) : (
                <View style={styles.balanceContainer}>
                  {(() => {
                    // Split balance into naira and kobo parts
                    const balanceText = walletBalance;
                    const decimalIndex = balanceText.indexOf('.');
                    
                    if (decimalIndex === -1) {
                      // No decimal point, just show the full amount
                      return <Text style={styles.walletAmount}>{balanceText}</Text>;
                    }
                    
                    const nairapart = balanceText.substring(0, decimalIndex);
                    const kobopart = balanceText.substring(decimalIndex);
                    
                    return (
                      <>
                        <Text style={styles.walletAmount}>{nairapart}</Text>
                        <Text style={styles.koboAmount}>{kobopart}</Text>
                      </>
                    );
                  })()}
                </View>
              )}
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
              tintColor="#FFFFFF"
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
  walletLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
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
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  walletAmount: {
    fontSize: 32,
    color: '#FFFFFF',
    fontFamily: fontFamilies.clashDisplay.bold,
    fontWeight: '700',
  },
  koboAmount: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: fontFamilies.clashDisplay.bold,
    fontWeight: '700',
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