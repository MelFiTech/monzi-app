import React from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import TransactionListItem, { Transaction } from './TransactionListItem';

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionPress?: (transaction: Transaction) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasMoreData?: boolean;
  scrollEnabled?: boolean;
}

export default function TransactionList({
  transactions,
  onTransactionPress,
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  hasMoreData = false,
  scrollEnabled = true,
}: TransactionListProps) {
  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TransactionListItem
      transaction={item}
      onPress={onTransactionPress}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No transactions found</Text>
      <Text style={styles.emptySubtext}>
        Your transaction history will appear here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMoreData) return null;
    
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#4A90E2" />
        <Text style={styles.footerText}>Loading more transactions...</Text>
      </View>
    );
  };

  const keyExtractor = (item: Transaction) => item.id;

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={keyExtractor}
        renderItem={renderTransaction}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4A90E2"
              colors={['#4A90E2']}
            />
          ) : undefined
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={transactions.length === 0 ? styles.emptyListContainer : undefined}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 8,
  },
}); 