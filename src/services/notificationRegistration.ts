import { create } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api } from './api';
import { secureStorage } from '../storage/secureStorage';
import { registerForPushNotificationsAsync } from './notifications';
import { createPushDeviceSession } from './pushDeviceSession';

const key = 'notification_installation_token';
// This client uses the captured account's access token. A late request cannot
// inherit a different user's token from the main API interceptor.
const registrationApi = create({ baseURL: api.defaults.baseURL, timeout: 10000 });

export function createNotificationRegistration(onStatus: (message: string) => void) {
  return createPushDeviceSession({
    getPushToken: registerForPushNotificationsAsync,
    getSession: async () => {
      const response = await api.get('/auth/me');
      const user = response.data.user;
      const accessToken = await secureStorage.getAccessToken();
      if (!user?.id || !accessToken) throw new Error('A signed-in account is required.');
      return { userId: user.id as number, accessToken };
    },
    readToken: () => SecureStore.getItemAsync(key),
    writeToken: token => token ? SecureStore.setItemAsync(key, token) : SecureStore.deleteItemAsync(key),
    register: async (pushToken, session) => {
      await registrationApi.post('/push-tokens', { pushToken, platform: Platform.OS }, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    },
    unregister: async (pushToken, session) => {
      await registrationApi.delete('/push-tokens', {
        data: { pushToken }, headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    },
    onStatus,
  });
}
