import { useQuery, useMutation } from '@tanstack/react-query';
import LocationService, { LocationMatch, LocationData } from '@/services/LocationService';

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