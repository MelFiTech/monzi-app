import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';

interface ProfileCardProps {
  name: string;
  email: string;
  avatar?: string;
  onPress?: () => void;
  showArrow?: boolean;
  subtitle?: string;
}

export function ProfileCard({
  name,
  email,
  avatar,
  onPress,
  showArrow = false,
  subtitle,
}: ProfileCardProps) {
  const { colors } = useTheme();

  const renderAvatar = () => {
    if (avatar) {
      return (
        <Image
          source={{ uri: avatar }}
          style={[styles.avatar, { backgroundColor: colors.surface }]}
        />
      );
    }

    // Default avatar with initials
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
              <View style={[styles.avatar, styles.defaultAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.initials, typography.heading.h4, { color: colors.white }]}>
            {initials}
          </Text>
        </View>
    );
  };

  const content = (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.leftSection}>
        {renderAvatar()}
        <View style={styles.textContainer}>
          <Text style={[styles.name, typography.label.large, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.email, typography.body.small, { color: colors.textSecondary }]} numberOfLines={1}>
            {email}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, typography.caption.medium, { color: colors.textTertiary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {showArrow && (
        <View style={styles.rightSection}>
          <Text style={[styles.arrow, { color: colors.textTertiary }]}>
            →
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    marginLeft: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  defaultAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 18,
    fontWeight: '600',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    fontSize: 18,
  },
});

export default ProfileCard; 