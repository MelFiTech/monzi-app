import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { fontFamilies } from '@/constants/fonts';
import Button from '@/components/common/Button';

const PRIMARY_COLOR = '#FFE66C';

interface ReferralInfoProps {
  onActivate: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReferralInfo({ onActivate }: ReferralInfoProps) {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <FontAwesome name="users" size={48} color="#FFFFFF" style={{ opacity: 0.7 }} />
          </View>
          <Text style={styles.title}>🎉 Earn 50% When your {'\n'} friends transact!</Text>
          <Text style={styles.subtitle}>
            Invite friends & get rewarded every time they transact.
          </Text>
        </View>

        {/* How It Works */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.smallDot}>
                <Text style={styles.smallDotText}>•</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share your code with friends</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.smallDot}>
                <Text style={styles.smallDotText}>•</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Your friend signs up using your code</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.smallDot}>
                <Text style={styles.smallDotText}>•</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>You earn 50% of their transaction fees</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Example Earnings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Example Earnings</Text>
          
          <View style={styles.benefitList}>
            <View style={styles.benefitItem}>
              <Text style={styles.smallDotText}>•</Text>
              <Text style={styles.benefitText}>Friend sends ₦1000. Fee ₦25. You earn ₦12.50</Text>
            </View>
          </View>
        </View>
      </View>

      {/* CTA Button - Fixed at bottom */}
      <View style={styles.fixedButtonContainer}>
        <Button
          title="Coming Soon"
          onPress={onActivate}
          style={[styles.activateButton, { backgroundColor: PRIMARY_COLOR }] as any}
          textStyle={{ color: '#000000' }}
        />
        <Text style={styles.ctaNote}>
          Start earning by inviting your friends today!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  container: {
    paddingVertical: 20,
    paddingBottom: 190, // Increased space for fixed button
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    opacity: 0.7, // Added opacity to the icon container
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  stepContainer: {
    gap: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  smallDot: {
    width: 12,
    height: 12,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  smallDotText: {
    fontSize: 10,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  benefitList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
    marginLeft: 0,
  },
  fixedButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  activateButton: {
    width: '100%',
    marginBottom: 12,
  },
  ctaNote: {
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
