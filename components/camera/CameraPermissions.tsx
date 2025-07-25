import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { CameraHeader } from '@/components/layout';
import { typography, fontFamilies } from '@/constants/fonts';
import { useTheme } from '@/providers/ThemeProvider';

interface CameraPermissionsProps {
  permission: any;
  onRequestPermission: () => void;
}

export default function CameraPermissions({ permission, onRequestPermission }: CameraPermissionsProps) {
  const { colors } = useTheme();

  const handleRequestPermission = async () => {
    try {
      console.log('📷 Requesting camera permission...');
      
      // If permission was denied and can't ask again, open settings directly
      if (permission && permission.canAskAgain === false) {
        console.log('🔧 Opening device settings for camera permission...');
        await Linking.openSettings();
        return;
      }
      
      // Otherwise, try to request permission normally
      await onRequestPermission();
      
      // Check if permission was granted after request
      if (permission?.granted) {
        console.log('✅ Camera permission granted');
      } else if (permission && permission.canAskAgain === false) {
        // Permission denied and can't ask again - guide user to settings
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required to scan account details. Please enable camera access in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: async () => {
                try {
                  await Linking.openSettings();
                } catch (error) {
                  console.error('❌ Failed to open settings:', error);
                }
              }
            }
          ]
        );
      } else {
        console.log('❌ Camera permission denied, but can ask again');
      }
    } catch (error) {
      console.error('❌ Error requesting camera permission:', error);
      Alert.alert(
        'Permission Error',
        'Failed to request camera permission. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        <CameraHeader />
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, { color: '#FFFFFF' }]}>
            Requesting camera permissions...
          </Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        <CameraHeader />
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, typography.heading.h4, { color: '#FFFFFF' }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionSubtext, typography.body.medium, { color: colors.textSecondary }]}>
            We need camera access to scan account details
          </Text>
          
          {/* Show different message if permission was denied and can't ask again */}
          {permission && permission.canAskAgain === false && (
            <Text style={[styles.permissionSubtext, typography.body.small, { color: colors.textSecondary, marginBottom: 16 }]}>
              Camera access was denied. Please enable it in your device settings.
            </Text>
          )}
          
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={handleRequestPermission}
            activeOpacity={0.8}
          >
            <Text style={[styles.permissionButtonText, typography.button.medium, { color: '#000000' }]}>
              {permission && permission.canAskAgain === false ? 'Open Settings' : 'Grant Camera Access'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 