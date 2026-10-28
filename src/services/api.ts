
import { create, isAxiosError,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';

import { secureStorage } from '../storage/secureStorage';

const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'https://employeeapi-3lob.onrender.com/api').replace(/\/+$/, '');

const sessionExpiredListeners = new Set<() => void>();
export function onSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener);
  return () => { sessionExpiredListeners.delete(listener); };
}

let sessionEpoch = 0;
export function resetApiSession() {
  sessionEpoch++;
  refreshPromise = null;
}

async function expireSession(expectedEpoch = sessionEpoch) {
  if (expectedEpoch !== sessionEpoch) return;
  const expiredEpoch = ++sessionEpoch;
  refreshPromise = null;
  await secureStorage.clearTokens();
  if (sessionEpoch === expiredEpoch) sessionExpiredListeners.forEach(listener => listener());
}

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _sessionEpoch?: number;
};

export const api = create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Refresh request main interceptor ni trigger cheyyakunda
// separate axios instance use chestunnam.
const refreshApi = create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const request = config as RetryConfig;
    request._sessionEpoch ??= sessionEpoch;
    if (request._sessionEpoch !== sessionEpoch) throw new Error('The signed-in account changed.');
    const token = await secureStorage.getAccessToken();
    if (request._sessionEpoch !== sessionEpoch) throw new Error('The signed-in account changed.');

    if (token && config.url !== '/auth/login' && config.url !== '/auth/refresh') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);

api.interceptors.response.use(
  response => {
    if ((response.config as RetryConfig)._sessionEpoch !== sessionEpoch)
      throw new Error('The signed-in account changed.');
    return response;
  },

  async (error: AxiosError) => {
    const originalRequest = error.config as
      | RetryConfig
      | undefined;

    const requestUrl = originalRequest?.url ?? '';
    const epoch = originalRequest?._sessionEpoch ?? sessionEpoch;
    if (epoch !== sessionEpoch) return Promise.reject(new Error('The signed-in account changed.'));

    // Login/refresh failures ki automatic refresh cheyyakudadhu.
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      await expireSession(epoch);
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const refreshToken =
            await secureStorage.getRefreshToken();

          if (!refreshToken) {
            await expireSession(epoch);
            return null;
          }

          const response = await refreshApi.post(
            '/auth/refresh',
            { refreshToken }
          );

          const newAccessToken =
            response.data.accessToken;

          const newRefreshToken =
            response.data.refreshToken;

          if (epoch !== sessionEpoch || await secureStorage.getRefreshToken() !== refreshToken)
            throw new Error('The signed-in account changed during token refresh.');

          if (typeof newAccessToken !== 'string' || !newAccessToken ||
              typeof newRefreshToken !== 'string' || !newRefreshToken) {
            throw new Error('The server returned an invalid refresh response. Please try again.');
          }

          await secureStorage.saveTokens(
            newAccessToken,
            newRefreshToken,
            () => epoch === sessionEpoch
          );

          return newAccessToken as string;
        })().catch(async refreshError => {
          if (isAxiosError(refreshError) &&
              (refreshError.response?.status === 401 || refreshError.response?.status === 403)) {
            await expireSession(epoch);
          }
          throw refreshError;
        }).finally(() => { if (epoch === sessionEpoch) refreshPromise = null; });
      }

      const newToken = await refreshPromise;

      if (!newToken) {
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization =
        `Bearer ${newToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);
