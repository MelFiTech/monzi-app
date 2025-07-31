import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import LocationService, { 
  LocationData, 
  GeofenceArea, 
  BackgroundLocationConfig,
  LocationMatch 
} from '@/services/LocationService';

export interface UseLocationServiceOptions {
  enableBackgroundMonitoring?: boolean;
  updateInterval?: number; // in milliseconds
  distanceThreshold?: number; // in meters
  geofenceRadius?: number; // in meters
  autoUpdateGeofences?: boolean;
}

export interface UseLocationServiceReturn {
  // State
  isBackgroundMonitoring: boolean;
  lastKnownLocation: LocationData | null;
  geofenceAreas: GeofenceArea[];
  hasLocationPermission: boolean;
  
  // Actions
  startBackgroundMonitoring: () => Promise<boolean>;
  stopBackgroundMonitoring: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationData | null>;
  addGeofenceAreas: (areas: GeofenceArea[]) => void;
  removeGeofenceAreas: (areaIds: string[]) => void;
  clearGeofenceAreas: () => void;
  updateGeofenceAreasFromBackend: () => Promise<void>;
  
  // Callbacks
  onLocationUpdate?: (location: LocationData) => void;
  onGeofenceEnter?: (area: GeofenceArea) => void;
  onGeofenceExit?: (area: GeofenceArea) => void;
}

export function useLocationService(options: UseLocationServiceOptions = {}): UseLocationServiceReturn {
  const {
    enableBackgroundMonitoring = false,
    updateInterval = 300000, // 5 minutes
    distanceThreshold = 100, // 100 meters
    geofenceRadius = 200, // 200 meters
    autoUpdateGeofences = true,
  } = options;

  const [isBackgroundMonitoring, setIsBackgroundMonitoring] = useState(false);
  const [lastKnownLocation, setLastKnownLocation] = useState<LocationData | null>(null);
  const [geofenceAreas, setGeofenceAreas] = useState<GeofenceArea[]>([]);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  
  const locationService = useRef(LocationService.getInstance());
  const configRef = useRef<BackgroundLocationConfig>({
    enabled: enableBackgroundMonitoring,
    updateInterval,
    distanceThreshold,
    geofenceRadius,
  });

  // Update config when options change
  useEffect(() => {
    configRef.current = {
      enabled: enableBackgroundMonitoring,
      updateInterval,
      distanceThreshold,
      geofenceRadius,
    };
  }, [enableBackgroundMonitoring, updateInterval, distanceThreshold, geofenceRadius]);

  // Check initial permission status
  useEffect(() => {
    const checkPermission = async () => {
      const hasPermission = await locationService.current.checkLocationPermission();
      setHasLocationPermission(hasPermission);
    };
    
    checkPermission();
  }, []);

  // Set up location update callback
  useEffect(() => {
    locationService.current.setLocationUpdateCallback((location: LocationData) => {
      setLastKnownLocation(location);
      console.log('📍 Location updated via hook:', location);
    });
  }, []);

  // Set up geofence enter callback
  useEffect(() => {
    locationService.current.setGeofenceEnterCallback((area: GeofenceArea) => {
      console.log('🎯 Geofence entered via hook:', area.name);
      // You can add custom logic here for when user enters a geofence
    });
  }, []);

  // Set up geofence exit callback
  useEffect(() => {
    locationService.current.setGeofenceExitCallback((area: GeofenceArea) => {
      console.log('🚪 Geofence exited via hook:', area.name);
      // You can add custom logic here for when user exits a geofence
    });
  }, []);

  // Auto-start background monitoring if enabled
  useEffect(() => {
    if (enableBackgroundMonitoring && hasLocationPermission) {
      startBackgroundMonitoring();
    }
  }, [enableBackgroundMonitoring, hasLocationPermission]);

  // Auto-update geofences from backend
  useEffect(() => {
    if (autoUpdateGeofences && lastKnownLocation) {
      const updateGeofences = async () => {
        await locationService.current.updateGeofenceAreasFromBackend();
        setGeofenceAreas(locationService.current.getGeofenceAreas());
      };
      
      updateGeofences();
    }
  }, [autoUpdateGeofences, lastKnownLocation]);

  const startBackgroundMonitoring = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🚀 Starting background location monitoring...');
      
      const success = await locationService.current.startBackgroundLocationMonitoring(configRef.current);
      
      if (success) {
        setIsBackgroundMonitoring(true);
        console.log('✅ Background location monitoring started successfully');
      } else {
        console.error('❌ Failed to start background location monitoring');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error starting background location monitoring:', error);
      return false;
    }
  }, []);

  const stopBackgroundMonitoring = useCallback(async (): Promise<void> => {
    try {
      console.log('🛑 Stopping background location monitoring...');
      
      await locationService.current.stopBackgroundLocationMonitoring();
      setIsBackgroundMonitoring(false);
      
      console.log('✅ Background location monitoring stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping background location monitoring:', error);
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔐 Requesting location permissions...');
      
      const granted = await locationService.current.requestLocationPermission();
      setHasLocationPermission(granted);
      
      if (granted) {
        console.log('✅ Location permissions granted');
      } else {
        console.warn('⚠️ Location permissions denied');
      }
      
      return granted;
    } catch (error) {
      console.error('❌ Error requesting location permissions:', error);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    try {
      console.log('📍 Getting current location...');
      
      const location = await locationService.current.getCurrentLocation();
      
      if (location) {
        setLastKnownLocation(location);
        console.log('✅ Current location obtained:', location);
      } else {
        console.warn('⚠️ Failed to get current location');
      }
      
      return location;
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      return null;
    }
  }, []);

  const addGeofenceAreas = useCallback((areas: GeofenceArea[]): void => {
    locationService.current.addGeofenceAreas(areas);
    setGeofenceAreas(locationService.current.getGeofenceAreas());
  }, []);

  const removeGeofenceAreas = useCallback((areaIds: string[]): void => {
    locationService.current.removeGeofenceAreas(areaIds);
    setGeofenceAreas(locationService.current.getGeofenceAreas());
  }, []);

  const clearGeofenceAreas = useCallback((): void => {
    locationService.current.clearGeofenceAreas();
    setGeofenceAreas([]);
  }, []);

  const updateGeofenceAreasFromBackend = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 Updating geofence areas from backend...');
      
      await locationService.current.updateGeofenceAreasFromBackend();
      setGeofenceAreas(locationService.current.getGeofenceAreas());
      
      console.log('✅ Geofence areas updated from backend');
    } catch (error) {
      console.error('❌ Error updating geofence areas from backend:', error);
    }
  }, []);

  return {
    // State
    isBackgroundMonitoring,
    lastKnownLocation,
    geofenceAreas,
    hasLocationPermission,
    
    // Actions
    startBackgroundMonitoring,
    stopBackgroundMonitoring,
    requestLocationPermission,
    getCurrentLocation,
    addGeofenceAreas,
    removeGeofenceAreas,
    clearGeofenceAreas,
    updateGeofenceAreasFromBackend,
  };
}

// Legacy hooks for backward compatibility
const locationService = LocationService.getInstance();

export const useLocationPermission = () => {
  return useQuery({
    queryKey: ['locationPermission'],
    queryFn: () => locationService.checkLocationPermission(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCurrentLocation = () => {
  return useQuery({
    queryKey: ['currentLocation'],
    queryFn: () => locationService.getCurrentLocation(),
    enabled: false, // Don't fetch automatically, only when called
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
};

export const usePreciseLocationSuggestions = (
  latitude: number | null,
  longitude: number | null,
  businessName: string | null
) => {
  return useQuery({
    queryKey: ['preciseLocationSuggestions', latitude, longitude, businessName],
    queryFn: () => {
      if (!latitude || !longitude || !businessName) {
        return null;
      }
      return locationService.getPreciseLocationSuggestions(latitude, longitude, businessName);
    },
    enabled: !!(latitude && longitude && businessName),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useNearbyLocationSuggestions = (
  latitude: number | null,
  longitude: number | null,
  radius: number = 1000
) => {
  return useQuery({
    queryKey: ['nearbyLocationSuggestions', latitude, longitude, radius],
    queryFn: () => {
      if (!latitude || !longitude) {
        return [];
      }
      return locationService.getNearbyLocationSuggestions(latitude, longitude, radius);
    },
    enabled: !!(latitude && longitude),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};

export const useRequestLocationPermission = () => {
  return useMutation({
    mutationFn: () => locationService.requestLocationPermission(),
    onSuccess: (granted) => {
      if (granted) {
        console.log('✅ Location permission granted');
      } else {
        console.log('❌ Location permission denied');
      }
    },
    onError: (error) => {
      console.error('Error requesting location permission:', error);
    },
  });
};

export const useGetCurrentLocation = () => {
  return useMutation({
    mutationFn: () => locationService.getCurrentLocation(),
    onSuccess: (location) => {
      if (location) {
        console.log('📍 Current location:', location);
      } else {
        console.log('❌ Failed to get current location');
      }
    },
    onError: (error) => {
      console.error('Error getting current location:', error);
    },
  });
}; 