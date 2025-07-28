import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import FloatingButton from './FloatingButton';

interface LocationFloatingButtonProps {
  onPress: () => void;
}

export default function LocationFloatingButton({ onPress }: LocationFloatingButtonProps) {
  console.log('📍 LocationFloatingButton rendered');
  
  return (
    <FloatingButton
      icon={<Ionicons name="location" size={24} color="#FFF" />}
      onPress={() => {
        console.log('📍 LocationFloatingButton pressed');
        onPress();
      }}
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