import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface AuthHeaderProps {
  variant?: 'back' | 'close' | 'none';
  onBack?: () => void;
  style?: ViewStyle;
  iconSize?: number;
}

export function AuthHeader({
  variant = 'back',
  onBack,
  style,
  iconSize = 24,
}: AuthHeaderProps) {
  const { colors } = useTheme();

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }

  if (variant === 'none') {
    return <View style={[headerStyles.header, style]} />;
  }

  return (
    <View style={[headerStyles.header, style]}>
      <TouchableOpacity onPress={handleBack} style={headerStyles.backButton}>
        {variant === 'close' ? (
          <X 
            size={iconSize} 
            color="#FFFFFF"
            strokeWidth={2}
          />
        ) : (
          <Image
            source={require('../../assets/icons/auth/arrow-left.png')}
            style={{
              width: iconSize,
              height: iconSize,
              tintColor: '#FFFFFF'
            }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,

  },
});

export default AuthHeader;
