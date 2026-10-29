// Supported app build lo matrame native notifications module load chesthundi.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type NotificationModule = typeof import('expo-notifications');
let cached: NotificationModule | null | undefined;

// Expo Go and older APKs may not contain the installed notification module.
// Never let an optional notification feature prevent the app from loading.
export function getNativeNotifications(): NotificationModule | null {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  if (Constants.executionEnvironment === 'storeClient') return null;
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
