import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Switch,
  ActivityIndicator 
} from 'react-native';
import { useWebSocketLocationService } from '@/hooks/useWebSocketLocationService';
import { ProximityResult, NearbyPaymentLocation, WebSocketError } from '@/services/WebSocketService';

export default function WebSocketLocationServiceDemo() {
  const [showDetails, setShowDetails] = useState(false);
  const [manualSubscriptionEnabled, setManualSubscriptionEnabled] = useState(false);
  const [manualUpdateFrequency, setManualUpdateFrequency] = useState(30);
  const [manualProximityRadius, setManualProximityRadius] = useState(40);

  const {
    // WebSocket Status
    isConnected,
    isConnecting,
    connectionError,
    
    // Location Settings
    locationNotificationsEnabled,
    isLoadingSettings,
    
    // Location Updates
    isLocationTrackingActive,
    lastLocationUpdate,
    locationUpdateCount,
    
    // Events
    proximityResults,
    nearbyPaymentLocations,
    locationErrors,
    
    // Actions
    connect,
    disconnect,
    startLocationTracking,
    stopLocationTracking,
    toggleLocationNotifications,
    enableLocationNotifications,
    disableLocationNotifications,
    sendManualLocationUpdate,
    
    // Manual Subscription Control
    subscribeToLocationTracking,
  } = useWebSocketLocationService({
    autoConnect: true,
    autoStartLocationUpdates: false,
    locationUpdateFrequency: 35,
    proximityRadius: 40,
  });

  // Handle proximity results
  useEffect(() => {
    if (proximityResults.length > 0) {
      const latestResult = proximityResults[0];
      Alert.alert(
        '🎯 Proximity Detected!',
        `You're ${latestResult.distance.toFixed(1)}m from ${latestResult.locationName}`,
        [{ text: 'OK' }]
      );
    }
  }, [proximityResults]);

  // Handle nearby payment locations
  useEffect(() => {
    if (nearbyPaymentLocations.length > 0) {
      const latestLocation = nearbyPaymentLocations[0];
      Alert.alert(
        '💳 Payment Location Nearby!',
        `Payment details available at ${latestLocation.locationName}`,
        [{ text: 'OK' }]
      );
    }
  }, [nearbyPaymentLocations]);

  // Handle location errors
  useEffect(() => {
    if (locationErrors.length > 0) {
      const latestError = locationErrors[0];
      Alert.alert(
        '❌ Location Error',
        latestError.message,
        [{ text: 'OK' }]
      );
    }
  }, [locationErrors]);

  const handleConnect = async () => {
    const success = await connect();
    if (success) {
      Alert.alert('✅ Connected', 'WebSocket connection established successfully');
    } else {
      Alert.alert('❌ Connection Failed', 'Failed to connect to WebSocket server');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    Alert.alert('🔌 Disconnected', 'WebSocket connection closed');
  };

  const handleStartTracking = async () => {
    const success = await startLocationTracking();
    if (success) {
      Alert.alert('✅ Tracking Started', 'Location tracking is now active');
    } else {
      Alert.alert('❌ Tracking Failed', 'Failed to start location tracking');
    }
  };

  const handleStopTracking = () => {
    stopLocationTracking();
    Alert.alert('🛑 Tracking Stopped', 'Location tracking has been stopped');
  };

  const handleToggleNotifications = async () => {
    const success = await toggleLocationNotifications();
    if (success) {
      Alert.alert(
        '✅ Settings Updated', 
        `Location notifications ${locationNotificationsEnabled ? 'disabled' : 'enabled'}`
      );
    } else {
      Alert.alert('❌ Update Failed', 'Failed to update notification settings');
    }
  };

  const handleManualSubscription = () => {
    subscribeToLocationTracking({
      enabled: manualSubscriptionEnabled,
      updateFrequency: manualUpdateFrequency,
      proximityRadius: manualProximityRadius,
    });
    Alert.alert('📡 Manual Subscription', 'Location tracking subscription sent to server');
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>WebSocket Location Service Demo</Text>
      
      {/* Connection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔌 Connection Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[styles.statusValue, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
          </Text>
        </View>
        {connectionError && (
          <Text style={styles.errorText}>Error: {connectionError}</Text>
        )}
        
        <View style={styles.buttonRow}>
          {!isConnected ? (
            <TouchableOpacity 
              style={[styles.button, styles.connectButton]} 
              onPress={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>Connect</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.disconnectButton]} 
              onPress={handleDisconnect}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Location Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Location Settings</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Notifications:</Text>
          <Text style={[styles.statusValue, { color: locationNotificationsEnabled ? '#4CAF50' : '#F44336' }]}>
            {locationNotificationsEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
        {isLoadingSettings && (
          <ActivityIndicator size="small" color="#007AFF" />
        )}
        
        <TouchableOpacity 
          style={[styles.button, styles.toggleButton]} 
          onPress={handleToggleNotifications}
          disabled={isLoadingSettings}
        >
          <Text style={styles.buttonText}>Toggle Notifications</Text>
        </TouchableOpacity>
      </View>

      {/* Location Tracking */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Location Tracking</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Tracking:</Text>
          <Text style={[styles.statusValue, { color: isLocationTrackingActive ? '#4CAF50' : '#FF9800' }]}>
            {isLocationTrackingActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Updates Sent:</Text>
          <Text style={styles.statusValue}>{locationUpdateCount}</Text>
        </View>
        
        {lastLocationUpdate && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationLabel}>Last Location:</Text>
            <Text style={styles.locationText}>
              {lastLocationUpdate.latitude.toFixed(6)}, {lastLocationUpdate.longitude.toFixed(6)}
            </Text>
          </View>
        )}
        
        <View style={styles.buttonRow}>
          {!isLocationTrackingActive ? (
            <TouchableOpacity 
              style={[styles.button, styles.startButton]} 
              onPress={handleStartTracking}
              disabled={!isConnected || !locationNotificationsEnabled}
            >
              <Text style={styles.buttonText}>Start Tracking</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.stopButton]} 
              onPress={handleStopTracking}
            >
              <Text style={styles.buttonText}>Stop Tracking</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={sendManualLocationUpdate}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>Send Update</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Manual Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📡 Manual Subscription</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Enable Subscription:</Text>
          <Switch
            value={manualSubscriptionEnabled}
            onValueChange={setManualSubscriptionEnabled}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.button, styles.subscribeButton]} 
          onPress={handleManualSubscription}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>Send Subscription</Text>
        </TouchableOpacity>
      </View>

      {/* Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📨 Recent Events</Text>
        
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => setShowDetails(!showDetails)}
        >
          <Text style={styles.toggleText}>
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Text>
        </TouchableOpacity>
        
        {showDetails && (
          <>
            {/* Proximity Results */}
            {proximityResults.length > 0 && (
              <View style={styles.eventSection}>
                <Text style={styles.eventTitle}>🎯 Proximity Results ({proximityResults.length})</Text>
                {proximityResults.slice(0, 3).map((result, index) => (
                  <View key={index} style={styles.eventItem}>
                    <Text style={styles.eventText}>
                      {formatTimestamp(result.timestamp)}: {result.locationName} ({result.distance.toFixed(1)}m)
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Nearby Payment Locations */}
            {nearbyPaymentLocations.length > 0 && (
              <View style={styles.eventSection}>
                <Text style={styles.eventTitle}>💳 Nearby Payment Locations ({nearbyPaymentLocations.length})</Text>
                {nearbyPaymentLocations.slice(0, 3).map((location, index) => (
                  <View key={index} style={styles.eventItem}>
                    <Text style={styles.eventText}>
                      {formatTimestamp(location.timestamp)}: {location.locationName} ({location.distance.toFixed(1)}m)
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Location Errors */}
            {locationErrors.length > 0 && (
              <View style={styles.eventSection}>
                <Text style={styles.eventTitle}>❌ Location Errors ({locationErrors.length})</Text>
                {locationErrors.slice(0, 3).map((error, index) => (
                  <View key={index} style={styles.eventItem}>
                    <Text style={styles.errorEventText}>
                      {formatTimestamp(error.timestamp)}: {error.type} - {error.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  startButton: {
    backgroundColor: '#2196F3',
  },
  stopButton: {
    backgroundColor: '#FF9800',
  },
  toggleButton: {
    backgroundColor: '#9C27B0',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: '#607D8B',
  },
  subscribeButton: {
    backgroundColor: '#FF5722',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  locationContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 4,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#666',
  },
  toggleButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleText: {
    fontSize: 12,
    color: '#666',
  },
  eventSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  eventItem: {
    marginBottom: 4,
  },
  eventText: {
    fontSize: 12,
    color: '#333',
  },
  errorEventText: {
    fontSize: 12,
    color: '#F44336',
  },
}); 