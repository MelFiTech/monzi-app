import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔧 SESSION TIMEOUT CONFIGURATION
// Change these values to adjust session expiration times
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (reduced from 30 minutes)
export const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for background timeout
// For testing: use 10 * 1000 for 10 seconds, 30 * 1000 for 30 seconds
export const LAST_ACTIVITY_KEY = 'lastActivityTimestamp';
export const BACKGROUND_ACTIVITY_KEY = 'backgroundActivityTimestamp';

export async function updateLastActivity() {
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export async function getLastActivity(): Promise<number> {
  const ts = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
  return ts ? parseInt(ts, 10) : 0;
}

export async function updateBackgroundActivity() {
  await AsyncStorage.setItem(BACKGROUND_ACTIVITY_KEY, Date.now().toString());
}

export async function getBackgroundActivity(): Promise<number> {
  const ts = await AsyncStorage.getItem(BACKGROUND_ACTIVITY_KEY);
  return ts ? parseInt(ts, 10) : 0;
}

export async function shouldRequireReauth(): Promise<boolean> {
  const last = await getLastActivity();
  if (!last) return false; // If never set, don't require
  const timeSinceLastActivity = Date.now() - last;
  const shouldReauth = timeSinceLastActivity > INACTIVITY_TIMEOUT_MS;
  console.log('🔒 Inactivity check:', { 
    lastActivity: new Date(last).toLocaleTimeString(),
    timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000) + 's',
    timeout: Math.round(INACTIVITY_TIMEOUT_MS / 1000) + 's',
    shouldReauth 
  });
  return shouldReauth;
}

export async function shouldRequireReauthFromBackground(): Promise<boolean> {
  const backgroundLast = await getBackgroundActivity();
  if (!backgroundLast) return false; // If never set, don't require
  const timeSinceBackground = Date.now() - backgroundLast;
  const shouldReauth = timeSinceBackground > BACKGROUND_TIMEOUT_MS;
  console.log('📱 Background check:', { 
    backgroundTime: new Date(backgroundLast).toLocaleTimeString(),
    timeSinceBackground: Math.round(timeSinceBackground / 1000) + 's',
    timeout: Math.round(BACKGROUND_TIMEOUT_MS / 1000) + 's',
    shouldReauth 
  });
  return shouldReauth;
} 