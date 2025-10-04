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
    const diffMs = Math.abs(now.getTime() - timestamp.getTime());
    const seconds = Math.floor(diffMs / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const getTransactionIcon = () => {
    return transaction.type === 'incoming' 
      ? require('../../assets/icons/history/credit-arrow.png')
      : require('../../assets/icons/history/debit-arrow.png');
  };

  const getAmountColor = () => {
    return transaction.type === 'incoming' ? '#6CB1FF' : '#FFFFFF';
  };

  const getTransactionDisplayText = () => {
    // Check for specific transaction types first
    const description = transaction.description?.toLowerCase() || '';
    
    // Airtime transactions
    if (description.includes('airtime') || description.includes('phone') || description.includes('mobile')) {
      return 'Airtime';
    }
    
    // Data transactions
    if (description.includes('data') || description.includes('internet') || description.includes('bundle')) {
      return 'Data';
    }
    
    // Bill payments
    if (description.includes('bill') || description.includes('payment') || description.includes('utility')) {
      return 'Bill Payment';
    }
    
    // For incoming transactions, show sender info
    if (transaction.type === 'incoming') {
      // If we have sender name and it's not "External Account", use it
      if (transaction.source && !transaction.source.toLowerCase().includes('external')) {
        return transaction.source;
      }
      // Otherwise, try to extract meaningful info from description
      if (transaction.description) {
        // Look for patterns like "Transfer from John Doe" or "Deposit from..."
        const fromMatch = transaction.description.match(/from\s+([^,]+)/i);
        if (fromMatch) {
          return fromMatch[1].trim();
        }
        // Look for patterns like "John Doe - Transfer"
        const nameMatch = transaction.description.match(/^([^-]+)\s*-\s*/);
        if (nameMatch) {
          return nameMatch[1].trim();
        }
      }
      return 'Transfer';
    }
    
    // For outgoing transactions, show recipient info
    if (transaction.type === 'outgoing') {
      // If we have recipient name and it's not "External Account", use it
      if (transaction.recipient && !transaction.recipient.toLowerCase().includes('external')) {
        return transaction.recipient;
      }
      // Otherwise, try to extract meaningful info from description
      if (transaction.description) {
        // Look for patterns like "Transfer to John Doe" or "Payment to..."
        const toMatch = transaction.description.match(/to\s+([^,]+)/i);
        if (toMatch) {
          return toMatch[1].trim();
        }
        // Look for patterns like "John Doe - Transfer"
        const nameMatch = transaction.description.match(/^([^-]+)\s*-\s*/);
        if (nameMatch) {
          return nameMatch[1].trim();
        }
      }
      return 'Transfer';
    }
    
    return 'Transaction';
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
          {formatTime(transaction.timestamp)} • {getTransactionDisplayText()} • {transaction.description}
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