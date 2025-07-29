import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies, fontSizes } from '@/constants/fonts';
import { AuthHeader } from '@/components/auth';
import { Button } from '@/components/common';
import { useAuth } from '@/hooks/useAuthService';

const reasons = [
  'Poor Customer Services',
  'Too hard to use',
  'Becoming Unbanked',
  'Not Tech-Savvy',
  "Doesn't feel safe",
  'Too much hassle.',
  'Account no longer needed'
];

export default function DeleteReasonScreen() {
  const { colors } = useTheme();
  const { requestAccountDeletion } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string>('');

  const handleContinue = async () => {
    if (!selectedReason) return;
    
    try {
      const result = await requestAccountDeletion.mutateAsync({
        reason: selectedReason,
      });

      if (result.success) {
        // Navigate to OTP verification screen with the reason
        router.push({
          pathname: '/delete-otp',
          params: { reason: selectedReason }
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to request account deletion');
      }
    } catch (error: any) {
      console.error('Delete account request error:', error);
      Alert.alert('Error', error.message || 'Failed to request account deletion. Please try again.');
    }
  };

  const ReasonOption = ({ reason }: { reason: string }) => (
    <TouchableOpacity 
      style={styles.reasonContainer}
      onPress={() => setSelectedReason(reason)}
      activeOpacity={0.7}
    >
      <View style={styles.reasonContent}>
        <Text style={styles.reasonText}>{reason}</Text>
        <View style={styles.radioContainer}>
          <View style={[
            styles.radioOuter,
            selectedReason === reason && styles.radioSelected
          ]}>
            {selectedReason === reason && (
              <View style={styles.radioInner} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Header */}
        <AuthHeader variant="back" />
        
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>What's your reason?</Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {reasons.map((reason, index) => (
            <ReasonOption key={index} reason={reason} />
          ))}
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.footer}>
          <Button
            title="Continue"
            variant={selectedReason ? "primary" : "secondary"}
            size="lg"
            fullWidth
            onPress={handleContinue}
            disabled={!selectedReason}
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
    fontSize: fontSizes.xl,
    fontFamily: fontFamilies.clashDisplay.semibold,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'left',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  reasonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  reasonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  reasonText: {
    flex: 1,
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
  },
  radioContainer: {
    marginLeft: 16,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#FFE66C',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFE66C',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 20,
  },
}); 