import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { ProfileScreen } from '@/components/profile';

export default function ModalScreen() {
  return (
    <>
      <ProfileScreen />
      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </>
  );
}
