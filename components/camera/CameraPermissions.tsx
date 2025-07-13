import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraHeader } from '@/components/layout';
import { typography, fontFamilies } from '@/constants/fonts';
import { useTheme } from '@/providers/ThemeProvider';

interface CameraPermissionsProps {
  permission: any;
  onRequestPermission: () => void;
}

export default function CameraPermissions({ permission, onRequestPermission }: CameraPermissionsProps) {
  const { colors } = useTheme();

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
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={onRequestPermission}
          >
            <Text style={[styles.permissionButtonText, typography.button.medium, { color: '#FFFFFF' }]}>
              Grant Camera Access
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