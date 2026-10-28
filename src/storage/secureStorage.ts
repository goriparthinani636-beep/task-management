import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
let writes: Promise<void> = Promise.resolve();
function mutate(operation: () => Promise<void>): Promise<void> {
  const next = writes.catch(() => {}).then(operation);
  writes = next;
  return next;
}
async function deleteBoth() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export const secureStorage = {
  saveTokens(accessToken: string, refreshToken: string, isCurrent: () => boolean = () => true): Promise<void> {
    return mutate(async () => {
      if (!isCurrent()) return;
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      if (!isCurrent()) await deleteBoth();
    });
  },
  async getAccessToken(): Promise<string | null> {
    await writes.catch(() => {});
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    await writes.catch(() => {});
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  clearTokens(): Promise<void> { return mutate(deleteBoth); },
};
