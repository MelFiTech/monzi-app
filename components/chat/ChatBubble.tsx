import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/constants/fonts';
import { Message } from '@/services/ChatService';

interface ChatBubbleProps {
  message: Message;
  index: number;
  totalMessages: number;
}

export default function ChatBubble({ message, index, totalMessages }: ChatBubbleProps) {
  const { colors, isDark } = useTheme();
  const isLastBotMessage = message.isBot && index === totalMessages - 1;

  // Enhanced theme-aware colors
  const bubbleStyles = message.isBot ? {
    backgroundColor: colors.surfaceVariant,
    textColor: colors.text,
  } : {
    backgroundColor: colors.primary,
    textColor: colors.white,
  };

  return (
    <View style={styles.messageContainer}>
      <View
        style={[
          styles.messageBubble,
          message.isBot ? styles.botBubble : styles.userBubble,
          {
            backgroundColor: bubbleStyles.backgroundColor,
            shadowColor: isDark ? '#FFFFFF' : '#000000',
            shadowOffset: {
              width: 0,
              height: 1,
            },
            shadowOpacity: isDark ? 0.1 : 0.1,
            shadowRadius: 2,
            elevation: 2,
          },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            typography.body.medium,
            {
              color: bubbleStyles.textColor,
            },
          ]}
        >
          {message.text}
        </Text>
      </View>
      
      <Text style={[
        styles.timestamp, 
        typography.caption.small, 
        { 
          color: colors.textTertiary,
          alignSelf: message.isBot ? 'flex-start' : 'flex-end',
          marginLeft: message.isBot ? 12 : 0,
          marginRight: message.isBot ? 0 : 12,
        }
      ]}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  botBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    marginLeft: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
    marginRight: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
}); 