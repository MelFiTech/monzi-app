import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { AuthHeader } from '@/components/auth';
import { Button } from '@/components/common';
import { useAuth } from '@/hooks/useAuthService';

export default function DeleteSuccessScreen() {
  const { colors } = useTheme();
  const { logout } = useAuth();

  const handleDone = async () => {
    try {
      // Logout the user since account is deleted
      await logout.mutateAsync({ clearAllData: true });
      // Navigate to auth screen
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even if logout fails
      router.replace('/(auth)/login');
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Header */}
        <AuthHeader variant="back" />

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.successIcon}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>

          <Text style={styles.title}>
            Termination request sent successfully
          </Text>

          <Text style={styles.subtitle}>
            This process will take 5days. We'll follow up with an email for further authentication
          </Text>
        </View>

        {/* Bottom Button */}
        <View style={styles.footer}>
          <Button
            title="Done"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleDone}
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFE66C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 36,
    color: '#FFE66C',
    fontWeight: 'bold',
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: 16,
    lineHeight: fontSizes['2xl'] * 1.2,
  },
  subtitle: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'left',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 20,
  },
}); 