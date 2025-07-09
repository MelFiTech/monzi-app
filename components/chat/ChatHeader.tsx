import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';

interface ChatHeaderProps {
  isTyping?: boolean;
}

export default function ChatHeader({ isTyping = false }: ChatHeaderProps) {
  const { colors, isDark } = useTheme();

  return (
    <BlurView
      intensity={80}
      tint={isDark ? 'dark' : 'light'}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <View style={styles.textContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]} />
          <Text style={[styles.headerTitle, typography.heading.h4, { color: colors.text }]}>
            Welcome, let's get you set up.
          </Text>
          <Text style={[styles.headerSubtitle, typography.caption.medium, { color: colors.textSecondary }]}>
            {isTyping ? 'typing...' : ''}
          </Text>
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
}); 