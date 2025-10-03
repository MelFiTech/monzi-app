import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuthService';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { AuthHeader } from '@/components/auth';
import { Button } from '@/components/common';

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const handleContinueWithDeletion = () => {
    router.push('/delete-reason');
  };

  // Get user's first name or fallback
  const userName = user?.firstName || '';

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Header */}
        <AuthHeader variant="back" />
        
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Delete {userName || ''} Account</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Empty Account Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Image 
                  source={require('../assets/icons/security/delete-icon.png')}
                  style={styles.sectionIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.sectionTitle}>Empty your account</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Bring your total balance to N0.00 by withdrawing all your funds to a bank account
            </Text>
          </View>

          {/* Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Text style={styles.infoIcon}>i</Text>
              </View>
              <Text style={styles.sectionTitle}>What happens when you delete</Text>
            </View>
            <Text style={styles.sectionDescription}>
              We'll delete all data you've shared after 30days of request except the transactional data needed for compliance
            </Text>
          </View>
        </View>

        {/* Bottom Button */}
        <View style={styles.footer}>
          <Button
            title="Continue with deletion"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleContinueWithDeletion}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'left',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  infoIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#FFFFFF',
    flex: 1,
  },
  sectionDescription: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 20,
  },
}); 
