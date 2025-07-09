import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { fontFamilies } from '@/constants/fonts';
import BottomSheetModal from './BottomSheetModal';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  selectedDate?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelect,
  selectedDate,
  minimumDate,
  maximumDate,
}: DatePickerModalProps) {
  const [tempDate, setTempDate] = useState(selectedDate || new Date());

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && date) {
        onSelect(date);
        onClose();
      } else {
        onClose();
      }
    } else if (date) {
      setTempDate(date);
    }
  };

  const handleConfirm = () => {
    onSelect(tempDate);
    onClose();
  };

  const handleCancel = () => {
    setTempDate(selectedDate || new Date());
    onClose();
  };

  // For Android, the picker shows immediately as a native modal
  if (Platform.OS === 'android' && visible) {
    return (
      <DateTimePicker
        value={selectedDate || new Date()}
        mode="date"
        display="default"
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        themeVariant="dark"
      />
    );
  }

  // For iOS, show the picker in our custom bottom sheet
  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={Platform.OS === 'ios' ? 350 : 320}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Date of Birth</Text>
        
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant="dark"
            textColor={Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.9)' : '#FFFFFF'}
            style={styles.picker}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.confirmButton} 
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
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
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 24,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
    borderRadius: Platform.OS === 'ios' ? 12 : 0,
    marginHorizontal: Platform.OS === 'ios' ? -4 : 0,
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 0,
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 140 : 120,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 16 : 12,
    marginTop: 'auto',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 16 : 16,
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' 
      ? 'rgba(255, 255, 255, 0.15)' 
      : 'rgba(255, 255, 255, 0.1)',
    borderRadius: Platform.OS === 'ios' ? 62 : 62,
    minHeight: Platform.OS === 'ios' ? 56 : 'auto',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 16 : 16,
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' ? '#007AFF' : '#FFE66C',
    borderRadius: Platform.OS === 'ios' ? 62 : 62,
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
  confirmButtonText: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontFamily: Platform.OS === 'ios' ? fontFamilies.sora.semiBold : fontFamilies.sora.semiBold,
    color: Platform.OS === 'ios' ? '#FFFFFF' : '#000000',
    fontWeight: Platform.OS === 'ios' ? '600' : 'normal',
  },
}); 