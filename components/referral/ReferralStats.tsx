import React from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { fontFamilies } from '@/constants/fonts';

interface ReferralStatsProps {
  totalEarnings: number;
  totalReferrals: number;
}

export default function ReferralStats({ totalEarnings, totalReferrals }: ReferralStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsGrid}>
        {/* Earnings Card */}
        <View style={styles.statCard}>
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{formatCurrency(totalEarnings)}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>

        {/* Referrals Card */}
        <View style={styles.statCard}>
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{totalReferrals}</Text>
            <Text style={styles.statLabel}>Total Referrals</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
  },
  statTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    marginBottom: 2,
    textAlign: 'left',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'left',
  },
});
