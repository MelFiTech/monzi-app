import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { fontFamilies } from '@/constants/fonts';

interface PhoneNumberInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (formattedValue: string, rawValue: string) => void;
  placeholder?: string;
  error?: string;
  style?: any;
}

const PhoneNumberInput = forwardRef<TextInput, PhoneNumberInputProps>(
  function PhoneNumberInput({
    label,
    value,
    onChangeText,
    placeholder = "Phone Number",
    error,
    style,
    ...props
  }, ref) {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const formatPhoneNumber = (input: string): { formatted: string; raw: string } => {
      // Remove all non-digits
      let digits = input.replace(/[^0-9]/g, '');
      
      // Handle different input scenarios
      if (digits.startsWith('234')) {
        // If they paste +234XXXXXXXXXX, remove the country code
        digits = digits.substring(3);
      }
      
      // Limit to 11 digits max
      digits = digits.substring(0, 11);
      
      // Nigerian numbers should be 11 digits starting with 0, or 10 digits without 0
      let rawValue = '';
      let formattedValue = '';
      
      if (digits.length === 0) {
        return { formatted: '', raw: '' };
      }
      
      if (digits.startsWith('0')) {
        // Format: 0XXXXXXXXXX (11 digits)
        rawValue = digits;
        if (digits.length > 1) {
          // Show as +234 XXXXXXXXXX for display
          const withoutLeadingZero = digits.substring(1);
          if (withoutLeadingZero.length > 0) {
            formattedValue = `+234 ${withoutLeadingZero}`;
          } else {
            formattedValue = '+234 ';
          }
        } else {
          formattedValue = '+234 ';
        }
      } else {
        // Format: XXXXXXXXXX (10 digits without leading 0)
        rawValue = `0${digits}`;
        formattedValue = `+234 ${digits}`;
      }
      
      return { formatted: formattedValue, raw: rawValue };
    };

    const handleTextChange = (text: string) => {
      const { formatted, raw } = formatPhoneNumber(text);
      onChangeText(formatted, raw);
    };

    const getPlaceholderText = () => {
      return "+234 Phone Number";
    };

    const isValidLength = (rawValue: string) => {
      const digits = rawValue.replace(/[^0-9]/g, '');
      return digits.length === 11 && digits.startsWith('0');
    };

    return (
      <View style={[styles.container, style]}>
        <View style={[
          styles.inputContainer,
          error && styles.inputError,
          isFocused && styles.inputFocused,
        ]}>
          <TextInput
            ref={ref}
            style={[styles.input, { color: '#FFFFFF' }]}
            value={value}
            onChangeText={handleTextChange}
            placeholder={getPlaceholderText()}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="center"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            maxLength={15} // +234 + space + 10 digits
            {...props}
            cursorColor="#FFE66C"
            selectionColor="#FFE66C"
          />
        </View>
        
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
  },
  inputFocused: {
    backgroundColor: '#151515',
  },
  inputError: {
    backgroundColor: '#151515',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: '#FFFFFF',
    height: '100%',
    textAlignVertical: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: fontFamilies.sora.regular,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default PhoneNumberInput; 