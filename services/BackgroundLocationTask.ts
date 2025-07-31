import * as TaskManager from 'expo-task-manager';
import LocationService from './LocationService';

const BACKGROUND_LOCATION_TASK = 'background-location';

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background location task error:', error);
    return;
  }

  try {
    const locationService = LocationService.getInstance();
    
    // Handle the location update
    if (data && data.locations && data.locations.length > 0) {
      const location = data.locations[0]; // Get the most recent location
      
      console.log('📍 Background location task received update:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      });
      
      // Process the location update
      await locationService.handleLocationUpdate(location);
    }
  } catch (error) {
    console.error('❌ Error in background location task:', error);
  }
});

export { BACKGROUND_LOCATION_TASK }; 