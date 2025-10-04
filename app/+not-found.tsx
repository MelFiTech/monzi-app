import { Link, Stack, router } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useEffect } from 'react';
import { Text, View } from '@/components/common/Themed';
import { fontFamilies } from '@/constants/fonts';

export default function NotFoundScreen() {
  // Auto-redirect to home after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found</Text>
        <Text style={styles.subtitle}>
          The screen you're looking for doesn't exist or failed to load.
        </Text>
        <Text style={styles.autoRedirect}>
          Redirecting to home screen in 3 seconds...
        </Text>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.buttonText}>Go to Home Screen</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFE66C',
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamilies.sora.bold,
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: '#000000',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  autoRedirect: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.medium,
    color: '#666666',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.medium,
    color: '#FFFFFF',
  },
});
