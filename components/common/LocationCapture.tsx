import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useGetCurrentLocation, useRequestLocationPermission } from '@/hooks/useLocationService';
import { LocationData } from '@/services/LocationService';

interface LocationCaptureProps {
  onLocationCaptured: (location: LocationData) => void;
  onError: (error: string) => void;
  autoCapture?: boolean;
}

export default function LocationCapture({ 
  onLocationCaptured, 
  onError, 
  autoCapture = true 
}: LocationCaptureProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const requestPermissionMutation = useRequestLocationPermission();
  const getLocationMutation = useGetCurrentLocation();

  useEffect(() => {
    if (autoCapture) {
      handleLocationCapture();
    }
  }, [autoCapture]);

  const handleLocationCapture = async () => {
    try {
      // First check if we have permission
      if (hasPermission === null) {
        const granted = await requestPermissionMutation.mutateAsync();
        setHasPermission(granted);
        
        if (!granted) {
          onError('Location permission is required to enhance your payment experience');
          return;
        }
      }

      // Get current location
      const location = await getLocationMutation.mutateAsync();
      
      if (location) {
        onLocationCaptured(location);
      } else {
        onError('Unable to get your current location. Please try again.');
      }
    } catch (error) {
      console.error('Location capture error:', error);
      onError('Failed to capture location. Please try again.');
    }
  };

  const requestLocationPermission = async () => {
    try {
      const granted = await requestPermissionMutation.mutateAsync();
      setHasPermission(granted);
      
      if (granted) {
        handleLocationCapture();
      } else {
        Alert.alert(
          'Location Permission Required',
          'Location access helps us provide better payment suggestions. Please enable location access in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              // This would typically open device settings
              console.log('Open device settings');
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      onError('Failed to request location permission');
    }
  };

  // This component doesn't render anything visible
  // It's a utility component for capturing location
  return null;
}

// Hook for easy location capture
export const useLocationCapture = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const captureLocation = async () => {
    setIsCapturing(true);
    setError(null);
    
    try {
      const locationData = await LocationCapture.prototype.handleLocationCapture?.();
      if (locationData) {
        setLocation(locationData);
        return locationData;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture location';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCapturing(false);
    }
  };

  return {
    location,
    error,
    isCapturing,
    captureLocation,
  };
}; 