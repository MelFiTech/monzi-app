import AsyncStorage from '@react-native-async-storage/async-storage';

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
//export const INACTIVITY_TIMEOUT_MS = 10 * 1000; // 10 seconds for very quick testing
export const LAST_ACTIVITY_KEY = 'lastActivityTimestamp';

export async function updateLastActivity() {
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export async function getLastActivity(): Promise<number> {
  const ts = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
  return ts ? parseInt(ts, 10) : 0;
}

export async function shouldRequireReauth(): Promise<boolean> {
  const last = await getLastActivity();
  if (!last) return false; // If never set, don't require
  return Date.now() - last > INACTIVITY_TIMEOUT_MS;
} 