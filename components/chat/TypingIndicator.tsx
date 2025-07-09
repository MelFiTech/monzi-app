import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';

interface TypingIndicatorProps {
  typingAnimation: Animated.Value;
}

export default function TypingIndicator({ typingAnimation }: TypingIndicatorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.messageContainer}>
      <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Animated.View style={[styles.typingDots, { opacity: typingAnimation }]}>
          <Text style={[styles.messageText, typography.body.medium, { color: colors.text }]}>●●●</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  botBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  typingDots: {
    alignItems: 'center',
  },
}); 