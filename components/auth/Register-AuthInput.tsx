import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';
import { 
  ChevronDown, 
  Calendar, 
  Eye, 
  EyeOff 
} from 'lucide-react-native';

interface RegisterAuthInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  inputType?: 'text' | 'email' | 'phone' | 'password' | 'dropdown' | 'date';
  onPress?: () => void;
  error?: string;
  style?: any;
}

const RegisterAuthInput = forwardRef<TextInput, RegisterAuthInputProps>(
  function RegisterAuthInput({
    label,
    value,
    onChangeText,
    placeholder,
    inputType = 'text',
    onPress,
    error,
    style,
    ...props
  }, ref) {
    const { colors } = useTheme();
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const getKeyboardType = () => {
      switch (inputType) {
        case 'email':
          return 'email-address' as const;
        case 'phone':
          return 'phone-pad' as const;
        default:
          return 'default' as const;
      }
    };

    const formatPhoneNumber = (text: string) => {
      // Remove all non-digits
      const digitsOnly = text.replace(/[^0-9]/g, '');
      
      // Handle different input formats
      if (digitsOnly.startsWith('0')) {
        // Remove leading zero (09038819008 -> 9038819008)
        const withoutLeadingZero = digitsOnly.substring(1);
        return withoutLeadingZero.slice(0, 10); // Max 10 digits after removing 0
      } else {
        // Direct format (9038819008)
        return digitsOnly.slice(0, 10); // Max 10 digits
      }
    };

    const formatPasscode = (text: string) => {
      // Only allow digits, max 6
      return text.replace(/[^0-9]/g, '').slice(0, 6);
    };

    const handleTextChange = (text: string) => {
      let formattedText = text;
      
      if (inputType === 'phone') {
        formattedText = formatPhoneNumber(text);
      } else if (inputType === 'password' && label.toLowerCase().includes('passcode')) {
        formattedText = formatPasscode(text);
      }
      
      onChangeText(formattedText);
    };

    const getDisplayValue = () => {
      if (inputType === 'phone' && value) {
        // Display with +234 prefix
        return `+234${value}`;
      }
      return value;
    };

    const getSecureTextEntry = () => {
      return inputType === 'password' && !isPasswordVisible;
    };

    const renderRightIcon = () => {
      switch (inputType) {
        case 'dropdown':
          return (
            <View style={styles.iconContainer}>
              <ChevronDown 
                size={20} 
                color="rgba(255, 255, 255, 0.5)" 
                strokeWidth={2}
              />
            </View>
          );
        case 'date':
          return (
            <View style={styles.iconContainer}>
              <Calendar 
                size={20} 
                color="rgba(255, 255, 255, 0.5)" 
                strokeWidth={2}
              />
            </View>
          );
        case 'password':
          return (
            <TouchableOpacity
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              style={[styles.iconButton, styles.iconContainer]}
            >
              {isPasswordVisible ? (
                <EyeOff 
                  size={20} 
                  color="rgba(255, 255, 255, 0.5)" 
                  strokeWidth={2}
                />
              ) : (
                <Eye 
                  size={20} 
                  color="rgba(255, 255, 255, 0.5)" 
                  strokeWidth={2}
                />
              )}
            </TouchableOpacity>
          );
        default:
          return null;
      }
    };

    const handlePress = () => {
      if (inputType === 'dropdown' || inputType === 'date') {
        onPress?.();
      }
    };

    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity
          style={[
            styles.inputContainer,
            error && styles.inputError,
            isFocused && styles.inputFocused,
            (inputType === 'dropdown' || inputType === 'date') && styles.touchableInput
          ]}
          onPress={handlePress}
          disabled={inputType !== 'dropdown' && inputType !== 'date'}
          activeOpacity={inputType === 'dropdown' || inputType === 'date' ? 0.7 : 1}
        >
          {(inputType === 'dropdown' || inputType === 'date') ? (
            <View style={styles.touchableContent}>
              <Text style={[
                styles.input,
                !value && styles.placeholder,
                { color: value ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)' },
                styles.touchableText
              ]}>
                {value || placeholder}
              </Text>
            </View>
          ) : (
            <TextInput
              ref={ref}
              style={[styles.input, { color: '#FFFFFF' }]}
              value={getDisplayValue()}
              onChangeText={handleTextChange}
              placeholder={inputType === 'phone' ? '+234 Phone Number' : placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              keyboardType={getKeyboardType()}
              secureTextEntry={getSecureTextEntry()}
              autoCapitalize={inputType === 'email' ? 'none' : 'sentences'}
              autoCorrect={false}
              textAlignVertical="center"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              maxLength={inputType === 'phone' ? 14 : (inputType === 'password' && label.toLowerCase().includes('passcode')) ? 6 : undefined}
              {...props}
            />
          )}
          
          {renderRightIcon()}
        </TouchableOpacity>
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 62,
    borderWidth: 0,
  },
  inputFocused: {
    borderWidth: 1,
    borderColor: '#FFE66C',
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  touchableInput: {
    // Additional styles for touchable inputs if needed
  },
  touchableContent: {
    flex: 1,
    justifyContent: 'center',
    height: '100%',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: '#FFFFFF',
    height: '100%',
    textAlignVertical: 'center',
    paddingRight: 8, // Add padding to prevent text from touching the icon
  },
  touchableText: {
    paddingVertical: 20, // Add vertical padding for better centering
    lineHeight: 22, // Adjust line height for better text alignment
  },
  placeholder: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
  },
  iconContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  iconButton: {
    padding: 4,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default RegisterAuthInput; 