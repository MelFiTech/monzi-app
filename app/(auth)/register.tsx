import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useRegister } from '@/hooks';
import { fontFamilies } from '@/constants/fonts';
import { X } from 'lucide-react-native';
import { RegisterAuthInput } from '@/components/auth';
import PhoneNumberInput from '@/components/auth/PhoneNumberInput';
import { Button, GenderSelectionModal, DatePickerModal } from '@/components/common';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const registerMutation = useRegister();
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    phoneDisplay: '', // For displaying formatted phone number
    gender: '',
    dob: '',
    passcode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const emailInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus on email field when screen mounts
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    router.back();
  };

  const updateField = (field: string, value: string) => {
    if (field === 'passcode') {
      // Only allow digits and max 6 characters for passcode
      const digitsOnly = value.replace(/[^0-9]/g, '');
      value = digitsOnly.slice(0, 6);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhoneChange = (formattedValue: string, rawValue: string) => {
    setFormData(prev => ({ 
      ...prev, 
      phoneDisplay: formattedValue,
      phone: rawValue 
    }));
    
    // Clear error when user starts typing
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleGenderSelect = () => {
    setGenderModalVisible(true);
  };

  const handleDateSelect = () => {
    setDatePickerVisible(true);
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForAPI = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const handleGenderSelection = (gender: string) => {
    updateField('gender', gender);
    setGenderModalVisible(false);
  };

  const handleDateSelection = (date: Date) => {
    setSelectedDate(date);
    updateField('dob', formatDate(date));
    setDatePickerVisible(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else {
      // Validate raw phone number (should be 11 digits starting with 0)
      const digitsOnly = formData.phone.replace(/[^0-9]/g, '');
      if (digitsOnly.length !== 11 || !digitsOnly.startsWith('0')) {
        newErrors.phone = 'Please enter a valid Nigerian phone number';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    }

    if (!formData.passcode) {
      newErrors.passcode = 'Passcode is required';
    } else if (formData.passcode.length !== 6) {
      newErrors.passcode = 'Passcode must be exactly 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;
    
    try {
      // Convert form data to API format
      const registrationData = {
        email: formData.email.trim(),
        phone: formData.phone.trim(), // Raw phone number (e.g., "09038819008")
        gender: formData.gender.toUpperCase() as 'MALE' | 'FEMALE' | 'OTHER',
        dateOfBirth: formatDateForAPI(selectedDate!), // Convert to YYYY-MM-DD
        passcode: formData.passcode,
      };
      
      console.log('Creating account with:', registrationData);
      
      const result = await registerMutation.mutateAsync(registrationData);
      
      if (result.success) {
        // Navigate to OTP verification with phone number for SMS
        router.push(`/(auth)/verify-otp?phone=${encodeURIComponent(formData.phone)}&email=${encodeURIComponent(formData.email)}`);
      } else {
        Alert.alert('Registration Failed', result.message || 'Failed to create account');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Registration failed. Please try again.');
    }
  };

  const isFormValid = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isEmailValid = formData.email && emailRegex.test(formData.email);
    
    // Check raw phone number
    const digitsOnly = formData.phone.replace(/[^0-9]/g, '');
    const isPhoneValid = digitsOnly.length === 11 && digitsOnly.startsWith('0');
    
    return isEmailValid && 
           isPhoneValid &&
           formData.gender && 
           formData.dob && 
           formData.passcode &&
           formData.passcode.length === 6;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Let's get you in</Text>
          <Text style={styles.subtitle}>
            Ensure your DOB & gender matches your{'\n'}BVN details.
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Form */}
          <View style={styles.form}>
            <RegisterAuthInput
              ref={emailInputRef}
              label="Email Address"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              placeholder="Email Address"
              inputType="email"
              error={errors.email}
            />

            <PhoneNumberInput
              label="Phone Number"
              value={formData.phoneDisplay}
              onChangeText={handlePhoneChange}
              error={errors.phone}
            />

            <View style={styles.rowContainer}>
              <View style={styles.halfWidth}>
                <RegisterAuthInput
                  label="Gender"
                  value={formData.gender}
                  onChangeText={() => {}} // Not used for dropdown
                  placeholder="Gender"
                  inputType="dropdown"
                  onPress={handleGenderSelect}
                  error={errors.gender}
                />
              </View>
              <View style={styles.halfWidth}>
                <RegisterAuthInput
                  label="DOB"
                  value={formData.dob}
                  onChangeText={() => {}} // Not used for date picker
                  placeholder="DOB"
                  inputType="date"
                  onPress={handleDateSelect}
                  error={errors.dob}
                />
              </View>
            </View>

            <RegisterAuthInput
              label="Set Passcode"
              value={formData.passcode}
              onChangeText={(text) => updateField('passcode', text)}
              placeholder="Set Passcode"
              inputType="password"
              error={errors.passcode}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <Button
            title={registerMutation.isPending ? "Creating Account..." : "Create Account"}
            onPress={handleCreateAccount}
            variant={isFormValid() ? "primary" : "secondary"}
            size="lg"
            fullWidth
            disabled={!isFormValid() || registerMutation.isPending}
            style={styles.createAccountButton}
          />

          {/* <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, it means you have read and{'\n'}accepted our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </View> */}
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <GenderSelectionModal
        visible={genderModalVisible}
        onClose={() => setGenderModalVisible(false)}
        onSelect={handleGenderSelection}
        selectedGender={formData.gender}
      />

      <DatePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onSelect={handleDateSelection}
        selectedDate={selectedDate}
        maximumDate={new Date()}
        minimumDate={new Date(1900, 0, 1)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  titleSection: {
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: fontFamilies.clashDisplay.bold,
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 24,
  },
  form: {
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 10,
    paddingTop: 20,
  },
  createAccountButton: {
    borderRadius: 100,
    marginBottom: 10,
    height: 56,
  },
  termsContainer: {
    alignItems: 'center',
    marginBottom: 5,
    
  },
  termsText: {
    fontSize: 14,
    fontFamily: fontFamilies.sora.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.sora.semiBold,
  },
}); 