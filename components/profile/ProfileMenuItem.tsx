import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  Switch,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { fontFamilies } from '@/constants/fonts';

interface ProfileMenuItemProps {
  title: string;
  subtitle?: string;
  icon: ImageSourcePropType;
  variant?: 'default' | 'toggle';
  onPress?: () => void;
  // Toggle variant props
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  // Special styling props
  isMonzoIcon?: boolean;
  disabled?: boolean;
}

export default function ProfileMenuItem({
  title,
  subtitle,
  icon,
  variant = 'default',
  onPress,
  toggleValue = false,
  onToggle,
  isMonzoIcon = false,
  disabled = false,
}: ProfileMenuItemProps) {
  const renderContent = () => (
    <View style={styles.menuItemLeft}>
      <View style={[styles.iconContainer, disabled && styles.disabledIconContainer]}>
        <Image
          source={icon}
          style={[
            styles.menuIcon,
            isMonzoIcon && styles.monzoIcon,
            disabled && styles.disabledIcon,
          ]}
        />
      </View>
      <View style={styles.menuItemText}>
        <Text style={[styles.menuItemTitle, disabled && styles.disabledText]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.menuItemSubtitle, disabled && styles.disabledSubtitle]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );

  const renderRightElement = () => {
    if (variant === 'toggle') {
      return (
        <Switch
          trackColor={{ 
            false: disabled ? '#444444' : '#767577', 
            true: disabled ? '#555555' : '#34C759' 
          }}
          thumbColor={toggleValue ? '#FFFFFF' : '#f4f3f4'}
          onValueChange={disabled ? undefined : onToggle}
          value={toggleValue}
          disabled={disabled}
        />
      );
    }

    return (
      <Image
        source={require('../../assets/icons/profile/chevron-right.png')}
        style={styles.chevronIcon}
      />
    );
  };

  if (variant === 'toggle') {
    return (
      <View style={styles.menuItem}>
        {renderContent()}
        {renderRightElement()}
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      {renderContent()}
      {renderRightElement()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    height: 82,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  monzoIcon: {
    width: 23,
    height: 13,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    fontWeight: '400',
    marginBottom: 6,
  },
  menuItemSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
  },
  chevronIcon: {
    width: 20,
    height: 20,
    tintColor: 'rgba(255, 255, 255, 0.6)',
  },
  disabledIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  disabledIcon: {
    tintColor: 'rgba(255, 255, 255, 0.3)',
  },
  disabledText: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  disabledSubtitle: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
}); 