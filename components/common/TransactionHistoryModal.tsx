import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { Button } from '@/components/common';
import TransactionList from './TransactionList';
import { Transaction } from './TransactionListItem';
import ToastService from '@/services/ToastService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TransactionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onTransactionPress?: (transaction: Transaction) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasMoreData?: boolean;
  onRequestStatement?: () => void;
}

export default function TransactionHistoryModal({
  visible,
  onClose,
  transactions,
  onTransactionPress,
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  hasMoreData = false,
  onRequestStatement,
}: TransactionHistoryModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleRequestStatement = () => {
    ToastService.success('Feature coming soon');
    // Add a small delay to ensure toast shows before any modal closing
    setTimeout(() => {
      onRequestStatement?.();
    }, 100);
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close history</Text>
            <View style={styles.chevronDown}>
              <Text style={styles.chevronDownIcon}>⌄</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Transaction List - Scrollable */}
        <View style={styles.listContainer}>
          <TransactionList
            transactions={transactions}
            onTransactionPress={onTransactionPress}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReached={onEndReached}
            hasMoreData={hasMoreData}
            scrollEnabled={true}
          />
        </View>

        {/* Fixed Footer */}
        <View style={styles.fixedFooter}>
          <Button
            title="Request Statement"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={handleRequestStatement}
          />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: -60, // Add 30px gap from bottom
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.85,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  closeText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 8,
  },
  chevronDown: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronDownIcon: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  listContainer: {
    flex: 1,
    minHeight: 0, // This is crucial for FlatList to scroll properly
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  fixedFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
}); 