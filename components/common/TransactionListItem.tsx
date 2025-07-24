import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { fontFamilies, fontSizes } from '@/constants/fonts';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'incoming' | 'outgoing';
  description: string;
  recipient?: string;
  source?: string;
  timestamp: Date;
  reference?: string;
  status?: 'successful' | 'pending' | 'failed';
  senderName?: string;
  senderAccount?: string;
  senderBank?: string;
}

interface TransactionListItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
}

export default function TransactionListItem({
  transaction,
  onPress,
}: TransactionListItemProps) {
  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'NGN' ? '₦' : currency;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours}h`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}d`;
    }
  };

  const getTransactionIcon = () => {
    return transaction.type === 'incoming' 
      ? require('@/assets/icons/history/credit-arrow.png')
      : require('@/assets/icons/history/debit-arrow.png');
  };

  const getAmountColor = () => {
    return transaction.type === 'incoming' ? '#6CB1FF' : '#FFFFFF';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(transaction)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Image 
          source={getTransactionIcon()}
          style={[
            styles.icon,
            { tintColor: transaction.type === 'incoming' ? '#6CB1FF' : '#FFFFFF' }
          ]}
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={[styles.amount, { color: getAmountColor() }]}>
          {formatAmount(transaction.amount, transaction.currency)}
        </Text>
        <Text style={styles.details} numberOfLines={1} ellipsizeMode="tail">
          {formatTime(transaction.timestamp)} • {transaction.recipient || transaction.source} • {transaction.description}
        </Text>
      </View>
      
      <View style={styles.chevronContainer}>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0)',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    width: 20,
    height: 20,
  },
  contentContainer: {
    flex: 1,
  },
  amount: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.clashDisplay.semibold,
    marginBottom: 4,
  },
  details: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  chevronContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 18,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.4)',
  },
}); 