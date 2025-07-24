import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { X, Copy, Share as ShareIcon, AlertCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import ToastService from '@/services/ToastService';
import { useTransactionDetail } from '@/hooks/useWalletService';
import WalletService from '@/services/WalletService';

interface TransactionDetailParams {
  id: string;
}

export default function TransactionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [copied, setCopied] = useState(false);

  // Debug: Log the transaction ID being fetched
  console.log('🔍 [TransactionDetail] Fetching transaction with ID:', params.id);

  // Fetch transaction details from API
  const { data: transaction, isLoading, error } = useTransactionDetail(params.id || '');

  // Debug: Log the fetched transaction data
  console.log('📊 [TransactionDetail] Transaction data:', {
    id: transaction?.id,
    type: transaction?.type,
    amount: transaction?.amount,
    description: transaction?.description,
    isLoading,
    error: error?.message
  });

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFE66C" />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load transaction details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatAmount = (amount: number | undefined, currency: string = 'NGN') => {
    if (amount === undefined || amount === null) {
      return '₦0.00';
    }
    const symbol = currency === 'NGN' ? '₦' : currency;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    return `On ${date.toLocaleDateString('en-US', options)}`;
  };

  // Updated status color logic per prompt
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'successful':
        return '#FFE66C'; // Success pill color
      case 'PENDING':
      case 'pending':
        return '#F59E0B';
      case 'FAILED':
      case 'failed':
        return '#EF4444'; // Red for failed
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'successful':
        return 'Successful';
      case 'PENDING':
      case 'pending':
        return 'Pending';
      case 'FAILED':
      case 'failed':
        return 'Failed';
      default:
        return 'Successful';
    }
  };

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return 'Deposit';
      case 'WITHDRAWAL':
        return 'Withdrawal';
      case 'TRANSFER':
        return 'Transfer';
      default:
        return 'Transaction';
    }
  };

  const truncateDescription = (description: string) => {
    if (!description) return 'N/A';
    
    // Remove common prefixes and clean up the description
    let cleanDescription = description
      .replace(/^(NIBSS|PROVIDER|BANK|WALLET):\d+:/, '') // Remove NIBSS:9017802974: prefix
      .replace(/^[A-Z]+:\d+:/, '') // Remove any other provider:number: prefix
      .replace(/^[A-Z]+\s*•\s*/, '') // Remove "PROVIDER • " prefix
      .replace(/:\s*misc\s*:.*$/, '') // Remove ":misc:..." suffix
      .replace(/:\s*[A-Z0-9]+$/, '') // Remove ":REFERENCE" suffix
      .trim();
    
    // If description is still too long, truncate it
    if (cleanDescription.length > 50) {
      cleanDescription = cleanDescription.substring(0, 50) + '...';
    }
    
    return cleanDescription || 'Transaction';
  };

  // Truncate transaction ID so it never wraps to 2 lines
  // This is done by limiting the length and using ellipsis if needed
  // The value is also rendered with numberOfLines={1} and ellipsizeMode="tail"
  const truncateTransactionId = (id: string | undefined, maxLength: number = 32) => {
    if (!id) return 'N/A';
    if (id.length > maxLength) {
      return id.substring(0, maxLength) + '...';
    }
    return id;
  };

  // Extract sender/recipient name from description
  const getSenderFromDescription = (description: string) => {
    if (!description) return 'Unknown';
    
    // For NIBSS format: "NIBSS:9017802974:GOODNESS ENYO OBAJE:misc:..."
    const nibssMatch = description.match(/NIBSS:\d+:(.+?):/);
    if (nibssMatch) {
      return nibssMatch[1];
    }
    
    // For other formats, look for name after second colon
    const colonMatch = description.match(/[A-Z]+:\d+:(.+?):/);
    if (colonMatch) {
      return colonMatch[1];
    }
    
    return 'Unknown';
  };

  const getRecipientFromDescription = (description: string) => {
    if (!description) return 'Unknown';
    
    // Look for "Transfer to NAME" pattern
    const transferToMatch = description.match(/Transfer to (.+)/);
    if (transferToMatch) {
      return transferToMatch[1];
    }
    
    // Look for "to NAME" pattern
    const toMatch = description.match(/to (.+)/);
    if (toMatch) {
      return toMatch[1];
    }
    
    return 'Unknown';
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleCopyReference = async () => {
    try {
      await Clipboard.setStringAsync(transaction.reference);
      setCopied(true);
      ToastService.success('Transaction ID copied');
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy transaction ID:', error);
      ToastService.error('Failed to copy');
    }
  };

  const handleShareReceipt = async () => {
    try {
      const fromToInfo = transaction.type === 'DEPOSIT' 
        ? `From: ${transaction.source?.name || getSenderFromDescription(transaction.description)} (${transaction.source?.accountNumber ? `${transaction.source.accountNumber} - ${transaction.source.bankName || 'Unknown'}` : 'External transfer'})`
        : `To: ${transaction.destination?.name || getRecipientFromDescription(transaction.description)} (${transaction.destination?.accountNumber ? `${transaction.destination.accountNumber} - ${transaction.destination.bankName || transaction.destination.provider || 'Unknown'}` : 'External transfer'})`;
      
      const message = `Transaction Receipt\n\nAmount: ${formatAmount(transaction.amount, transaction.currency)}\nDate: ${formatDate(transaction.createdAt || new Date().toISOString())}\nStatus: ${getStatusText(transaction.status || 'COMPLETED')}\n${fromToInfo}\nTransaction ID: ${transaction.reference || 'N/A'}\nDescription: ${truncateDescription(transaction.description)}`;
      
      await Share.share({
        message,
        title: 'Transaction Receipt',
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
      ToastService.error('Failed to share receipt');
    }
  };

  const handleReportTransaction = () => {
    Alert.alert(
      'Report Transaction',
      'Are you sure you want to report this transaction?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement report transaction functionality
            ToastService.info('Transaction reported');
          },
        },
      ]
    );
  };

  // Modified renderDetailRow to allow removing border for Transaction ID row
  // For Transaction ID, ensure it never wraps to 2 lines
  const renderDetailRow = (label: string, value: string, showCopy?: boolean, noBorder?: boolean, isTransactionId?: boolean) => (
    <View
      style={[
        styles.detailRow,
        noBorder && { borderBottomWidth: 0 },
      ]}
    >
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        {isTransactionId ? (
          <Text
            style={styles.detailValue}
            numberOfLines={1}
            ellipsizeMode="tail"
            selectable
          >
            {value}
          </Text>
        ) : (
          <Text style={styles.detailValue}>{value}</Text>
        )}
      </View>
      {showCopy && (
        <TouchableOpacity onPress={handleCopyReference} style={styles.copyButton}>
          {copied ? (
            <Text style={styles.copyIcon}>✓</Text>
          ) : (
            <Copy size={16} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.5} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <X size={24} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* All transaction info in a single container with bg and border radius */}
      <View style={styles.detailsOuterContainer}>
        {/* Transaction Summary (amount, date, badge) */}
        <View style={styles.summaryContainerInDetails}>
          <Text style={styles.amountText}>
            {formatAmount(transaction.amount, transaction.currency)}
          </Text>
          <Text style={styles.dateText}>
            {formatDate(transaction.createdAt || new Date().toISOString())}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(transaction.status || 'COMPLETED') }]}>
            <Text style={styles.statusText}>{getStatusText(transaction.status || 'COMPLETED')}</Text>
          </View>
        </View>
        {/* Transaction Details */}
        <View style={styles.detailsContainer}>
                  {/* Show From/To based on transaction type */}
        {transaction.type === 'DEPOSIT' ? (
          <>
            {renderDetailRow('From', transaction.source?.name || getSenderFromDescription(transaction.description))}
            {renderDetailRow('From Acc. details', transaction.source?.accountNumber 
              ? `${transaction.source.accountNumber} /${transaction.source.bankName || 'Unknown'}`
              : 'External transfer'
            )}
          </>
        ) : (
          <>
            {renderDetailRow('To', transaction.destination?.name || getRecipientFromDescription(transaction.description))}
            {renderDetailRow('To Acc. details', transaction.destination?.accountNumber 
              ? `${transaction.destination.accountNumber} /${transaction.destination.bankName || transaction.destination.provider || 'Unknown'}`
              : 'External transfer'
            )}
          </>
        )}
                  {renderDetailRow('Transaction type', getTransactionTypeText(transaction.type))}
        {renderDetailRow('Description', truncateDescription(transaction.description))}
        {transaction.fee && (
          typeof transaction.fee === 'object' && transaction.fee.amount > 0 ? (
            renderDetailRow('Fee', formatAmount(transaction.fee.amount, transaction.fee.currency))
          ) : typeof transaction.fee === 'number' && transaction.fee > 0 ? (
            renderDetailRow('Fee', formatAmount(transaction.fee, 'NGN'))
          ) : null
        )}
        {renderDetailRow('Transaction ID', truncateTransactionId(transaction.reference), true, true, true)}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsOuterContainer}>
        <View style={styles.actionsContainerCustom}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShareReceipt}>
            <View style={styles.actionIcon}>
              <ShareIcon size={20} color="#FFFFFF" strokeWidth={1.5} />
            </View>
            <Text style={styles.actionText}>Share receipt</Text>
          </TouchableOpacity>
          
          <View style={styles.actionDivider} />
          
          <TouchableOpacity style={styles.actionButton} onPress={handleReportTransaction}>
            <View style={styles.actionIcon}>
              <AlertCircle size={20} color="#FFFFFF" strokeWidth={1.5} />
            </View>
            <Text style={styles.actionText}>Report Transaction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  // Container for all transaction info (amount, date, badge, details)
  detailsOuterContainer: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    marginTop: 24,
    overflow: 'hidden',
  },
  // Summary inside details container
  summaryContainerInDetails: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 0,
    paddingHorizontal: 20,
  },
  amountText: {
    fontSize: 36,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  dateText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#000000',
  },
  detailsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    // Prevent wrapping for transaction id
    flexShrink: 1,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  copyIcon: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#10B981',
  },
  // Outer container for padding and alignment
  actionsOuterContainer: {
    marginTop: 'auto',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Custom container for action buttons with background and border radius
  actionsContainerCustom: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
  },
  actionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 20,
    marginRight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FFE66C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#000000',
  },
}); 