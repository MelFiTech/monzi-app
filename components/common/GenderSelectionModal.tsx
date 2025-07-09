import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { fontFamilies } from '@/constants/fonts';
import BottomSheetModal from './BottomSheetModal';

interface GenderSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gender: string) => void;
  selectedGender?: string;
}

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export default function GenderSelectionModal({
  visible,
  onClose,
  onSelect,
  selectedGender,
}: GenderSelectionModalProps) {
  const handleSelectGender = (gender: string) => {
    onSelect(gender);
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={Platform.OS === 'ios' ? 300 : 280}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Gender</Text>
        
        <View style={styles.optionsContainer}>
          {genderOptions.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                index === 0 && styles.firstOption,
                index === genderOptions.length - 1 && styles.lastOption,
                selectedGender === option.value && styles.selectedOption,
              ]}
              onPress={() => handleSelectGender(option.value)}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedGender === option.value && styles.selectedOptionText,
                ]}
              >
                {option.label}
              </Text>
              {selectedGender === option.value && (
                <Check 
                  size={Platform.OS === 'ios' ? 20 : 18} 
                  color={Platform.OS === 'ios' ? '#007AFF' : '#FFE66C'} 
                  strokeWidth={Platform.OS === 'ios' ? 3 : 2.5}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 17 : 20,
    fontFamily: Platform.OS === 'ios' ? fontFamilies.sora.semiBold : fontFamilies.sora.semiBold,
    color: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.9)' : '#FFFFFF',
    textAlign: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 24,
    fontWeight: Platform.OS === 'ios' ? '600' : 'normal',
  },
  optionsContainer: {
    marginBottom: Platform.OS === 'ios' ? 20 : 24,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    borderRadius: Platform.OS === 'ios' ? 12 : 0,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 16 : 16,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 16,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
    borderRadius: Platform.OS === 'ios' ? 0 : 12,
    marginBottom: Platform.OS === 'ios' ? 0 : 12,
    borderBottomWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderBottomColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
    minHeight: Platform.OS === 'ios' ? 56 : 'auto',
  },
  firstOption: {
    borderTopLeftRadius: Platform.OS === 'ios' ? 12 : 0,
    borderTopRightRadius: Platform.OS === 'ios' ? 12 : 0,
  },
  lastOption: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: Platform.OS === 'ios' ? 12 : 0,
    borderBottomRightRadius: Platform.OS === 'ios' ? 12 : 0,
  },
  selectedOption: {
    backgroundColor: Platform.OS === 'ios' 
      ? 'rgba(0, 122, 255, 0.15)' 
      : 'rgba(255, 230, 108, 0.1)',
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    borderColor: Platform.OS === 'ios' ? 'transparent' : '#FFE66C',
  },
  optionText: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontFamily: Platform.OS === 'ios' ? fontFamilies.sora.regular : fontFamilies.sora.regular,
    color: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.9)' : '#FFFFFF',
    fontWeight: Platform.OS === 'ios' ? '400' : 'normal',
  },
  selectedOptionText: {
    color: Platform.OS === 'ios' ? '#007AFF' : '#FFE66C',
    fontFamily: Platform.OS === 'ios' ? fontFamilies.sora.medium : fontFamilies.sora.semiBold,
    fontWeight: Platform.OS === 'ios' ? '600' : 'normal',
  },
  cancelButton: {
    paddingVertical: Platform.OS === 'ios' ? 16 : 16,
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' 
      ? 'rgba(255, 255, 255, 0.15)' 
      : 'rgba(255, 255, 255, 0.1)',
    borderRadius: Platform.OS === 'ios' ? 12 : 12,
    marginTop: 'auto',
    minHeight: Platform.OS === 'ios' ? 56 : 'auto',
  },
  cancelButtonText: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontFamily: Platform.OS === 'ios' ? fontFamilies.sora.medium : fontFamilies.sora.medium,
    color: Platform.OS === 'ios' 
      ? 'rgba(255, 255, 255, 0.8)' 
      : 'rgba(255, 255, 255, 0.7)',
    fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
  },
}); 