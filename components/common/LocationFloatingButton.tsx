import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import FloatingButton from './FloatingButton';

interface LocationFloatingButtonProps {
  onPress: () => void;
  isLoading?: boolean;
}

export default function LocationFloatingButton({ onPress, isLoading = false }: LocationFloatingButtonProps) {
  console.log('📍 LocationFloatingButton rendered');
  
  return (
    <FloatingButton
      icon={
        isLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Ionicons name="location" size={24} color="#FFF" />
        )
      }
      onPress={() => {
        console.log('📍 LocationFloatingButton pressed');
        onPress();
      }}
      hapticFeedback="light"
      style={{
        position: 'absolute',
        bottom: 40,
        left: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.28)',
        zIndex: 9999,
        elevation: 9999,
      }}
    />
  );
} 