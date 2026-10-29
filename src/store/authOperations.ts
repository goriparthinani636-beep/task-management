// Login, session restore and logout steps ikkada run avuthayi.
import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import type { SessionUser } from '../services/employeeScope';
import {
  loginSuccess,
  sessionFinished,
  sessionStarted,
  type AuthRootState,
} from './authSlice';

export interface AuthDependencies {
  api: {
    get(path: string): Promise<{ data: any }>;
    post(path: string, body?: unknown): Promise<{ data: any }>;
  };
  storage: {
    getAccessToken(): Promise<string | null>;
    getRefreshToken(): Promise<string | null>;
    saveTokens(access: string, refresh: string, current?: () => boolean): Promise<void>;
    clearTokens(): Promise<void>;
  };
  validateUser(value: unknown, email?: string, role?: SessionUser['role']): SessionUser;
  resetApiSession(): void;
  stopNotifications(): void;
}
type AuthThunk<Result = Promise<void>> = ThunkAction<
  Result,
  AuthRootState,
  AuthDependencies,
  UnknownAction
>;

function publicUser(user: SessionUser): SessionUser {
  // Only the display/authorization identity belongs in shared UI state.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
  };
}

// Manual thunks keep credentials out of serializable Redux actions and DevTools.
export const login =
  (email: string, password: string, role: SessionUser['role']): AuthThunk =>
  async (dispatch, getState, services) => {
    if (getState().auth.isSigningIn || getState().auth.isLoggingOut) return;
    services.resetApiSession();
    services.stopNotifications();
    dispatch(sessionStarted('login'));
    const version = getState().auth.sessionVersion;
    const current = () => getState().auth.sessionVersion === version;
    try {
      await services.storage.clearTokens();
      if (!current()) return;
      const { data } = await services.api.post('/auth/login', {
        email: email.trim(),
        password,
        role,
      });
      if (!current()) return;
      if (
        typeof data.accessToken !== 'string' ||
        !data.accessToken ||
        typeof data.refreshToken !== 'string' ||
        !data.refreshToken
      )
        throw new Error('The server login response is missing session tokens.');
      const user = publicUser(services.validateUser(data.user, email, role));
      await services.storage.saveTokens(data.accessToken, data.refreshToken, current);
      if (current()) dispatch(loginSuccess({ user, version }));
    } catch (error) {
      if (current()) {
        dispatch(sessionFinished(version));
        throw error;
      }
    }
  };

export const restoreSession = (): AuthThunk => async (dispatch, getState, services) => {
  // StrictMode/remounts must not launch competing restore requests.
  if (getState().auth.restoreStarted) return;
  dispatch(sessionStarted('restore'));
  const version = getState().auth.sessionVersion;
  const current = () => getState().auth.sessionVersion === version;
  try {
    const access = await services.storage.getAccessToken();
    const refresh = await services.storage.getRefreshToken();
    if (!current()) return;
    if (!access || !refresh) {
      await services.storage.clearTokens();
      if (current()) dispatch(sessionFinished(version));
      return;
    }
    const { data } = await services.api.get('/auth/me');
    const user = publicUser(services.validateUser(data.user ?? data));
    const latestAccess = await services.storage.getAccessToken();
    if (!current()) return;
    if (!latestAccess) {
      dispatch(sessionFinished(version));
      return;
    }
    dispatch(loginSuccess({ user, version }));
  } catch {
    // api.ts handles revoked sessions; temporary network errors preserve storage.
    if (current()) dispatch(sessionFinished(version));
  }
};

export const logout = (): AuthThunk => async (dispatch, getState, services) => {
  services.resetApiSession();
  services.stopNotifications();
  dispatch(sessionStarted('logout'));
  const version = getState().auth.sessionVersion;
  try {
    await services.api.post('/auth/logout');
  } catch {
    /* Local logout must complete even while the server is unavailable. */
  } finally {
    if (getState().auth.sessionVersion === version) {
      try {
        await services.storage.clearTokens();
      } finally {
        dispatch(sessionFinished(version));
      }
    }
  }
};
