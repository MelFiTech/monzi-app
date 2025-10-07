import { Stack, router } from 'expo-router';
import { StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { fontFamilies, fontSizes } from '@/constants/fonts';

export default function NotFoundScreen() {
  const [countdown, setCountdown] = useState(3);

  // Auto-redirect to home after countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Emoji Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.emoji}>🤔</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Page Not Found</Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>
            The screen you're looking for doesn't exist or failed to load.
          </Text>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>
              Redirecting in {countdown}s...
            </Text>
          </View>

          {/* Button */}
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 230, 108, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  countdownContainer: {
    backgroundColor: 'rgba(255, 230, 108, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 40,
  },
  countdownText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFE66C',
  },
  button: {
    backgroundColor: '#FFE66C',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 65,
    minWidth: 200,
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.sora.semiBold,
    color: '#000000',
    textAlign: 'center',
    fontWeight: '600',
  },
});
