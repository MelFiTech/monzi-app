import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocationService } from '@/hooks/useLocationService';
import { GeofenceArea } from '@/services/LocationService';

interface BackgroundLocationManagerProps {
  enabled?: boolean;
  onLocationUpdate?: (location: { latitude: number; longitude: number }) => void;
  onGeofenceEnter?: (area: GeofenceArea) => void;
  onGeofenceExit?: (area: GeofenceArea) => void;
}

export default function BackgroundLocationManager({
  enabled = false,
  onLocationUpdate,
  onGeofenceEnter,
  onGeofenceExit,
}: BackgroundLocationManagerProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  
  const {
    isBackgroundMonitoring,
    lastKnownLocation,
    geofenceAreas,
    hasLocationPermission,
    startBackgroundMonitoring,
    stopBackgroundMonitoring,
    requestLocationPermission,
    getCurrentLocation,
    updateGeofenceAreasFromBackend,
  } = useLocationService({
    enableBackgroundMonitoring: isEnabled,
    updateInterval: 300000, // 5 minutes
    distanceThreshold: 100, // 100 meters
    geofenceRadius: 200, // 200 meters
    autoUpdateGeofences: true,
  });

  // Handle location updates
  useEffect(() => {
    if (lastKnownLocation && onLocationUpdate) {
      onLocationUpdate(lastKnownLocation);
    }
  }, [lastKnownLocation, onLocationUpdate]);

  // Handle geofence events
  useEffect(() => {
    if (onGeofenceEnter || onGeofenceExit) {
      // Set up callbacks in the hook
      // This would be handled by the useLocationService hook
    }
  }, [onGeofenceEnter, onGeofenceExit]);

  const handleToggleMonitoring = async () => {
    if (!hasLocationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Location Permission Required',
          'Background location monitoring requires location permissions. Please enable them in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    if (isBackgroundMonitoring) {
      await stopBackgroundMonitoring();
      setIsEnabled(false);
    } else {
      const success = await startBackgroundMonitoring();
      if (success) {
        setIsEnabled(true);
        // Get initial location
        await getCurrentLocation();
        // Update geofences from backend
        await updateGeofenceAreasFromBackend();
      } else {
        Alert.alert(
          'Failed to Start Monitoring',
          'Unable to start background location monitoring. Please check your location settings.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestLocationPermission();
    if (granted) {
      Alert.alert('Success', 'Location permissions granted!', [{ text: 'OK' }]);
    } else {
      Alert.alert(
        'Permission Denied',
        'Location permissions are required for background monitoring. Please enable them in your device settings.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Background Location Monitoring</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Permission Status:</Text>
        <Text style={[styles.statusValue, { color: hasLocationPermission ? '#4CAF50' : '#F44336' }]}>
          {hasLocationPermission ? 'Granted' : 'Denied'}
        </Text>
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Monitoring Status:</Text>
        <Text style={[styles.statusValue, { color: isBackgroundMonitoring ? '#4CAF50' : '#FF9800' }]}>
          {isBackgroundMonitoring ? 'Active' : 'Inactive'}
        </Text>
      </View>
      
      {lastKnownLocation && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Last Known Location:</Text>
          <Text style={styles.locationValue}>
            {lastKnownLocation.latitude.toFixed(6)}, {lastKnownLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Geofence Areas:</Text>
        <Text style={styles.statusValue}>{geofenceAreas.length} active</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        {!hasLocationPermission ? (
          <TouchableOpacity style={styles.button} onPress={handleRequestPermission}>
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.button, isBackgroundMonitoring ? styles.stopButton : styles.startButton]} 
            onPress={handleToggleMonitoring}
          >
            <Text style={styles.buttonText}>
              {isBackgroundMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {hasLocationPermission && !isBackgroundMonitoring && (
        <TouchableOpacity style={styles.secondaryButton} onPress={getCurrentLocation}>
          <Text style={styles.secondaryButtonText}>Get Current Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  locationContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    marginTop: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#2196F3',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
}); 