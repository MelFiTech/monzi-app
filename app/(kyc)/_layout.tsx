import { Stack } from 'expo-router';

export default function KycLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        // Disable swipe back gestures in KYC flow to prevent interrupting verification
        gestureEnabled: false,
        // Hide back button in header
        headerBackVisible: false,
      }}
    >
      <Stack.Screen 
        name="bridge" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="bvn" 
        options={{ 
          headerShown: false, 
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="bvn-loader" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="bvn-success" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="biometrics" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="camera" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="photo-review" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="selfie-loader" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
    </Stack>
  );
}