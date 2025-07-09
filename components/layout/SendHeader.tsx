import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';
import { X, QrCode } from 'lucide-react-native';

interface SendHeaderProps {
  title: string;
  onClose: () => void;
  onScan?: () => void;
}

export function SendHeader({ title, onClose, onScan }: SendHeaderProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity style={styles.iconButton} onPress={onClose}>
          <X size={24} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={[styles.title, typography.heading.h4, { color: colors.white }]}>
          {title}
        </Text>

        {/* Scan Button */}
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={onScan}
          disabled={!onScan}
        >
          {onScan && (
            <QrCode size={24} color={colors.white} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    height: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
}); 