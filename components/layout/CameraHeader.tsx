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
import { ArrowLeft, Copy, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import Toast from '@/components/common/Toast';
import { WalletHeaderSkeleton } from '@/components/common';
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
  const { data: balanceData, isLoading: isBalanceLoading } = useWalletBalance();
  const { data: walletDetails, isLoading: isWalletLoading } = useWalletDetails();

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
        console.log('🚨🚨🚨 [FRONTEND] WALLET BALANCE UPDATE RECEIVED 🚨🚨🚨');
        console.log('📊 [CameraHeader] Raw notification data:', JSON.stringify(notification, null, 2));
        
        const balanceChange = {
          oldBalance: notification.oldBalance,
          newBalance: notification.newBalance,
          changeAmount: notification.change, // Backend uses "change" not "amount"
          isCredit: notification.change > 0,
          isDebit: notification.change < 0,
        };
        
        console.log('💰 [CameraHeader] BALANCE CHANGE DETAILS:', {
          component: 'CameraHeader',
          timestamp: new Date().toISOString(),
          eventType: 'wallet_balance_updated',
          userId: notification.userId,
          balanceChange,
          transaction: {
            reference: notification.reference, // Backend uses "reference" not "transactionReference"
            accountNumber: notification.accountNumber,
            currency: notification.currency,
            timestamp: notification.timestamp,
          }
        });
        
        // Prominent balance change log
        if (notification.change > 0) {
          console.log(`💰💰💰 [WALLET CREDITED] +₦${notification.change} | Old: ₦${notification.oldBalance} → New: ₦${notification.newBalance}`);
        } else if (notification.change < 0) {
          console.log(`💸💸💸 [WALLET DEBITED] ₦${notification.change} | Old: ₦${notification.oldBalance} → New: ₦${notification.newBalance}`);
        }
        
        // Invalidate wallet queries to refresh balance display
        console.log('🔄 [CameraHeader] Invalidating React Query cache...');
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
        queryClient.invalidateQueries({ queryKey: ['wallet', 'details'] });
        queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
        
        console.log('✅ [CameraHeader] React Query cache invalidated - UI should refresh now');
      },
      onTransactionNotification: (notification) => {
        console.log('🚨🚨🚨 [FRONTEND] TRANSACTION NOTIFICATION RECEIVED 🚨🚨🚨');
        console.log('📊 [CameraHeader] Raw transaction data:', JSON.stringify(notification, null, 2));
        
        console.log('💳 [CameraHeader] TRANSACTION DETAILS:', {
          component: 'CameraHeader',
          timestamp: new Date().toISOString(),
          eventType: 'transaction_notification',
          userId: notification.userId,
          transaction: {
            type: notification.type,
            amount: notification.amount,
            reference: notification.reference, // Backend uses "reference" not "transactionReference"
            currency: notification.currency,
            description: notification.description,
            status: notification.status,
            timestamp: notification.timestamp,
          }
        });
        
        console.log(`💳💳💳 [TRANSACTION ${notification.type?.toUpperCase()}] ₦${notification.amount} | Status: ${notification.status} | Ref: ${notification.reference}`);
        
        // Refresh wallet data for any transaction
        console.log('🔄 [CameraHeader] Invalidating wallet queries for transaction...');
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        
        console.log('✅ [CameraHeader] Wallet data cache invalidated for transaction');
      },
      onConnect: () => {
        console.log('🚨🚨🚨 [FRONTEND] SOCKET CONNECTED TO BACKEND 🚨🚨🚨');
        console.log('🔌 [CameraHeader] Real-time notifications connected:', {
          component: 'CameraHeader',
          timestamp: new Date().toISOString(),
          event: 'connected',
          userId: user?.id,
          message: 'Successfully connected to Socket.IO notifications server'
        });
        console.log('✅ [CameraHeader] Ready to receive wallet balance updates and transaction notifications');
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

  // Check if we should show skeleton loader
  const isWalletDataLoading = hasWalletAccess && (isBalanceLoading || isWalletLoading);

  const handleAddPress = () => {
    // Show "Feature coming soon" toast
    setShowToast(true);
    // You can customize the toast message here
  };

  const handleModalPress = () => {
    router.push('/profile');
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleCopyAccount = async () => {
    if (!hasWalletAccess || !walletDetails?.virtualAccountNumber) {
      return;
    }
    
    try {
      await Clipboard.setStringAsync(walletDetails.virtualAccountNumber);
      setCopied(true);
      setShowToast(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy account number:', error);
    }
  };

  const toggleBalanceVisibility = () => {
    setIsBalanceHidden(!isBalanceHidden);
  };

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent 
      />
      <Toast
        visible={showToast}
        message="Feature coming soon"
        type="info"
        onHide={() => setShowToast(false)}
      />
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.75)', 'rgba(0, 0, 0, 0)']}
        style={styles.header}
      >
        {/* Left Circle */}
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity style={styles.iconButton} onPress={handleBackPress}>
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.iconButton} onPress={handleModalPress}>
              <View style={[styles.profileAvatar, {  backgroundColor: 'rgba(0, 0, 0, 0.28)' }]}>
                <Image 
                  source={require('@/assets/icons/home/monzi.png')}
                  style={{width: 24, height: 24}}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Center Section */}
        <View style={styles.centerSection}>
          {isWalletDataLoading ? (
            <WalletHeaderSkeleton />
          ) : (
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
          )}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton} onPress={handleAddPress}>
            <Image 
              source={require('@/assets/icons/home/qr.png')}
              style={{width: 20, height: 24}}
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
});

export default CameraHeader;