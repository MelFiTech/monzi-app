import React, { forwardRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, TextInputProps, KeyboardTypeOptions } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  inputType?: 'email' | 'phone' | 'password' | 'otp' | 'text';
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

const ChatInput = forwardRef<TextInput, ChatInputProps>(({
  value,
  onChangeText,
  onSend,
  placeholder,
  inputType = 'text',
  maxLength,
  autoFocus = true,
  disabled = false,
}, ref) => {
  const { colors } = useTheme();

  const getKeyboardType = (): KeyboardTypeOptions => {
    switch (inputType) {
      case 'email': return 'email-address';
      case 'phone': return 'phone-pad';
      case 'otp': return 'number-pad';
      default: return 'default';
    }
  };

  const getAutoCapitalize = () => {
    return inputType === 'email' ? 'none' : 'words';
  };

  const isInputValid = value.trim().length > 0;

  return (
    <View style={[
      styles.inputContainer, 
      { 
        backgroundColor: colors.surface, 
        borderTopColor: colors.border 
      }
    ]}>
      <View style={[
        styles.inputWrapper, 
        { 
          backgroundColor: colors.surfaceVariant, 
          borderColor: colors.border 
        }
      ]}>
        <TextInput
          ref={ref}
          style={[styles.textInput, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={inputType === 'password'}
          keyboardType={getKeyboardType()}
          autoCapitalize={getAutoCapitalize()}
          autoFocus={autoFocus}
          returnKeyType="send"
          onSubmitEditing={onSend}
          maxLength={maxLength}
          editable={!disabled}
        />
      </View>
      <TouchableOpacity
        style={[
          styles.sendButton, 
          { 
            backgroundColor: isInputValid ? colors.primary : colors.border,
            opacity: isInputValid ? 1 : 0.5
          }
        ]}
        onPress={onSend}
        disabled={!isInputValid || disabled}
      >
        <Text style={[styles.sendButtonText, { color: colors.white }]}>→</Text>
      </TouchableOpacity>
    </View>
  );
});

ChatInput.displayName = 'ChatInput';

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
});

export default ChatInput; 