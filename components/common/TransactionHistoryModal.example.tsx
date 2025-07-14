import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { TransactionHistoryModal, Transaction } from '@/components/common';
import { fontFamilies, fontSizes } from '@/constants/fonts';

// Sample transaction data
const sampleTransactions: Transaction[] = [
  {
    id: '1',
    amount: 25550.00,
    currency: 'NGN',
    type: 'outgoing',
    description: 'Moniepoint • QFA NG LTD (Krispy...',
    recipient: 'Moniepoint',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    reference: 'TXN001',
  },
  {
    id: '2',
    amount: 15550.00,
    currency: 'NGN',
    type: 'outgoing',
    description: 'Access Bank • Cold Stone Gateway...',
    recipient: 'Access Bank',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    reference: 'TXN002',
  },
  {
    id: '3',
    amount: 15550.00,
    currency: 'NGN',
    type: 'outgoing',
    description: 'OPay • Cold Stone Gateway Mail Ng',
    recipient: 'OPay',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    reference: 'TXN003',
  },
  {
    id: '4',
    amount: 100000.00,
    currency: 'NGN',
    type: 'incoming',
    description: 'GTB • Aisha Adwan',
    source: 'GTB',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    reference: 'TXN004',
  },
  {
    id: '5',
    amount: 15550.00,
    currency: 'NGN',
    type: 'outgoing',
    description: 'GTB • Cold Stone Gateway Mail Ng',
    recipient: 'GTB',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    reference: 'TXN005',
  },
  {
    id: '6',
    amount: 15550.00,
    currency: 'NGN',
    type: 'outgoing',
    description: 'GTB • Cold Stone Gateway Mail Ng',
    recipient: 'GTB',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    reference: 'TXN006',
  },
  {
    id: '7',
    amount: 200000.00,
    currency: 'NGN',
    type: 'incoming',
    description: 'GTB • Aisha Adwan',
    source: 'GTB',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    reference: 'TXN007',
  },
];

export default function TransactionHistoryExample() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleTransactionPress = (transaction: Transaction) => {
    console.log('Transaction pressed:', transaction);
    // Navigate to transaction details or show transaction details modal
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleEndReached = () => {
    console.log('Load more transactions');
    // Load more transactions from API
  };

  const handleRequestStatement = () => {
    console.log('Request statement');
    // Handle statement request
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.buttonText}>Show Transaction History</Text>
      </TouchableOpacity>

      <TransactionHistoryModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        transactions={sampleTransactions}
        onTransactionPress={handleTransactionPress}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        hasMoreData={true}
        onRequestStatement={handleRequestStatement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.medium,
  },
}); 