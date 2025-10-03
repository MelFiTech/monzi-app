import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { fontFamilies } from '@/constants/fonts';

interface Referral {
  id: string;
  name: string;
  referralCode: string;
  joinedDate: string;
  status: 'active' | 'pending';
}

interface ReferralListProps {
  referrals: Referral[];
}

export default function ReferralList({ referrals }: ReferralListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: 'active' | 'pending') => {
    return status === 'active' ? '#4CAF50' : '#FFA726';
  };

  const renderReferralItem = ({ item }: { item: Referral }) => (
    <View style={styles.referralItem}>
      <View style={styles.referralInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.referralName}>{item.name}</Text>
          <View style={styles.statusDot} >
            <FontAwesome 
              name="circle" 
              size={10} 
              color={getStatusColor(item.status)} 
            />
          </View>
        </View>
        <Text style={styles.referralCode}>{item.referralCode}</Text>
      </View>
      <Text style={styles.joinedDate}>{formatDate(item.joinedDate)}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome name="users" size={48} color="rgba(255, 255, 255, 0.3)" />
      <Text style={styles.emptyTitle}>No Referrals Yet</Text>
      <Text style={styles.emptyDescription}>
        Start sharing your referral code to see your referrals here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Your Referrals</Text>
        <Text style={styles.countText}>{referrals.length} total</Text>
      </View>
      
      {referrals.length > 0 ? (
        <FlatList
          data={referrals}
          renderItem={renderReferralItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        renderEmptyState()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
  },
  countText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  listContainer: {
    gap: 12,
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    // borderWidth and borderColor removed to eliminate border
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-between',
  },
  referralInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  referralName: {
    fontSize: 16,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    marginRight: 8,
  },
  statusDot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralCode: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)', // changed to gray
    marginBottom: 2,
  },
  joinedDate: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 8,
    minWidth: 90,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
