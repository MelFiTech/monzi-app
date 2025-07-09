import { Stack } from 'expo-router';

export default function KycLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="bridge" options={{ headerShown: false }} />
      <Stack.Screen name="bvn" options={{ headerShown: false }} />
      <Stack.Screen name="bvn-loader" options={{ headerShown: false }} />
      <Stack.Screen name="bvn-success" options={{ headerShown: false }} />
      <Stack.Screen name="biometrics" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ headerShown: false }} />
      <Stack.Screen name="photo-review" options={{ headerShown: false }} />
      <Stack.Screen name="selfie-loader" options={{ headerShown: false }} />
    </Stack>
  );
}