import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
} from 'react-native';
import { fontFamilies } from '@/constants/fonts';
import { X } from 'lucide-react-native';

interface ProfileHeaderProps {
  onClose: () => void;
  version?: string;
}

export default function ProfileHeader({
  onClose,
  version = 'beta 2.0.0',
}: ProfileHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.versionBadge}>
        <Text style={styles.versionText}>{version}</Text>
      </View>
      <TouchableOpacity onPress={onClose}>
        <X size={24} color="rgba(255, 255, 255, 0.3)" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 52,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontFamily: fontFamilies.sora.semiBold,
  },
}); 