// Supported app build lo matrame native notifications module load chesthundi.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type NotificationModule = typeof import('expo-notifications');
let cached: NotificationModule | null | undefined;

// Expo Go does not support Android remote push notifications. Detect it using
// its app ownership/config markers so optional push setup cannot crash startup.
export function getNativeNotifications(): NotificationModule | null {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  if (Constants.appOwnership === 'expo' || Constants.expoGoConfig != null) return null;
  if (cached !== undefined) return cached;
  try {
    // Metro needs a literal require; loading must happen after the runtime check.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationModule;
  } catch {
    cached = null;
  }
  return cached;
}
