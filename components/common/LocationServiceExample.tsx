import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import BackgroundLocationManager from './BackgroundLocationManager';
import { useLocationService } from '@/hooks/useLocationService';
import { GeofenceArea } from '@/services/LocationService';

export default function LocationServiceExample() {
  const [locationUpdates, setLocationUpdates] = useState<Array<{ latitude: number; longitude: number; timestamp: number }>>([]);
  const [geofenceEvents, setGeofenceEvents] = useState<Array<{ type: 'enter' | 'exit'; area: GeofenceArea; timestamp: number }>>([]);

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
    enableBackgroundMonitoring: false, // Start disabled, let user control
    updateInterval: 300000, // 5 minutes
    distanceThreshold: 100, // 100 meters
    geofenceRadius: 200, // 200 meters
    autoUpdateGeofences: true,
  });

  const handleLocationUpdate = (location: { latitude: number; longitude: number }) => {
    const newUpdate = {
      ...location,
      timestamp: Date.now(),
    };
    
    setLocationUpdates(prev => [newUpdate, ...prev.slice(0, 9)]); // Keep last 10 updates
    
    console.log('📍 Location update received:', newUpdate);
  };

  const handleGeofenceEnter = (area: GeofenceArea) => {
    const event = {
      type: 'enter' as const,
      area,
      timestamp: Date.now(),
    };
    
    setGeofenceEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
    
    Alert.alert(
      'Payment Location Nearby!',
      `You're near ${area.name}. Payment details are available.`,
      [{ text: 'OK' }]
    );
    
    console.log('🎯 Geofence entered:', area.name);
  };

  const handleGeofenceExit = (area: GeofenceArea) => {
    const event = {
      type: 'exit' as const,
      area,
      timestamp: Date.now(),
    };
    
    setGeofenceEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
    
    console.log('🚪 Geofence exited:', area.name);
  };

  const handleManualLocationCheck = async () => {
    const location = await getCurrentLocation();
    if (location) {
      handleLocationUpdate(location);
      Alert.alert('Location Retrieved', `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`);
    } else {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handleUpdateGeofences = async () => {
    await updateGeofenceAreasFromBackend();
    Alert.alert('Geofences Updated', `Found ${geofenceAreas.length} payment locations nearby`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Service Example</Text>
      
      {/* Background Location Manager */}
      <BackgroundLocationManager
        enabled={false}
        onLocationUpdate={handleLocationUpdate}
        onGeofenceEnter={handleGeofenceEnter}
        onGeofenceExit={handleGeofenceExit}
      />
      
      {/* Status Information */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.statusText}>
          Permission: {hasLocationPermission ? '✅ Granted' : '❌ Denied'}
        </Text>
        <Text style={styles.statusText}>
          Monitoring: {isBackgroundMonitoring ? '✅ Active' : '⏸️ Inactive'}
        </Text>
        <Text style={styles.statusText}>
          Geofence Areas: {geofenceAreas.length} active
        </Text>
      </View>
      
      {/* Last Known Location */}
      {lastKnownLocation && (
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Last Known Location</Text>
          <Text style={styles.locationText}>
            Lat: {lastKnownLocation.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Lng: {lastKnownLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}
      
      {/* Recent Location Updates */}
      {locationUpdates.length > 0 && (
        <View style={styles.updatesSection}>
          <Text style={styles.sectionTitle}>Recent Location Updates</Text>
          {locationUpdates.slice(0, 3).map((update, index) => (
            <Text key={index} style={styles.updateText}>
              {new Date(update.timestamp).toLocaleTimeString()}: {update.latitude.toFixed(4)}, {update.longitude.toFixed(4)}
            </Text>
          ))}
        </View>
      )}
      
      {/* Recent Geofence Events */}
      {geofenceEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Recent Geofence Events</Text>
          {geofenceEvents.slice(0, 3).map((event, index) => (
            <Text key={index} style={styles.eventText}>
              {new Date(event.timestamp).toLocaleTimeString()}: {event.type.toUpperCase()} {event.area.name}
            </Text>
          ))}
        </View>
      )}
      
      {/* Manual Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Manual Actions</Text>
        <Text style={styles.actionText} onPress={handleManualLocationCheck}>
          📍 Get Current Location
        </Text>
        <Text style={styles.actionText} onPress={handleUpdateGeofences}>
          🔄 Update Geofences from Backend
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
  },
  locationSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  updatesSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  updateText: {
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  eventsSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#d1ecf1',
    borderRadius: 8,
  },
  eventText: {
    fontSize: 12,
    marginBottom: 2,
  },
  actionsSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 8,
    textDecorationLine: 'underline',
  },
}); 