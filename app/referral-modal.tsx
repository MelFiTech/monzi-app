import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { fontFamilies } from '@/constants/fonts';
import { useAuth } from '@/providers/AuthProvider';
import ReferralInfo from '@/components/referral/ReferralInfo';
import ReferralStats from '@/components/referral/ReferralStats';
import ReferralCodeBanner from '@/components/referral/ReferralCodeBanner';
import ReferralList from '@/components/referral/ReferralList';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReferralData {
  hasReferrals: boolean;
  totalEarnings: number;
  totalReferrals: number;
  referralCode: string;
  referrals: Array<{
    id: string;
    name: string;
    referralCode: string;
    joinedDate: string;
    status: 'active' | 'pending';
  }>;
}

export default function ReferralModalScreen() {
  const { authToken } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - replace with actual API call
    const loadReferralData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - replace with real API call
        const mockData: ReferralData = {
          hasReferrals: false, // Change to false to see new user state
          totalEarnings: 2500,
          totalReferrals: 8,
          referralCode: 'MONZI2024',
          referrals: [
            {
              id: '1',
              name: 'John Doe',
              referralCode: 'JOHN123',
              joinedDate: '2024-01-15',
              status: 'active'
            },
            {
              id: '2',
              name: 'Jane Smith',
              referralCode: 'JANE456',
              joinedDate: '2024-01-20',
              status: 'active'
            },
            {
              id: '3',
              name: 'Mike Johnson',
              referralCode: 'MIKE789',
              joinedDate: '2024-02-01',
              status: 'pending'
            }
          ]
        };
        
        setReferralData(mockData);
      } catch (error) {
        console.error('Error loading referral data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReferralData();
  }, [authToken]);

  const handleClose = () => {
    router.back();
  };

  const handleActivateReferral = () => {
    // TODO: Implement referral activation
    console.log('Activating referral system...');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Referral Rewards</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <FontAwesome name="times" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!referralData?.hasReferrals ? (
          // New user state - no referrals yet
          <ReferralInfo onActivate={handleActivateReferral} />
        ) : (
          // Main state - user has referrals
          <>
            <ReferralStats 
              totalEarnings={referralData.totalEarnings}
              totalReferrals={referralData.totalReferrals}
            />
            
            <ReferralCodeBanner referralCode={referralData.referralCode} />
            
            <ReferralList referrals={referralData.referrals} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});