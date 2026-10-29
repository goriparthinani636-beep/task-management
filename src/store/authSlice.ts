// Shared login state ikkada untundi. Passwords and tokens Redux lo store cheyyamu.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SessionUser } from '../services/employeeScope';

export interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSigningIn: boolean;
  isLoggingOut: boolean;
  restoreStarted: boolean;
  sessionVersion: number;
  notificationStatus: string;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isSigningIn: false,
  isLoggingOut: false,
  restoreStarted: false,
  sessionVersion: 0,
  notificationStatus: 'Sign in to enable task notifications.',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<'login' | 'restore' | 'logout'>) {
      state.sessionVersion++;
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = action.payload === 'restore';
      state.isSigningIn = action.payload === 'login';
      state.isLoggingOut = action.payload === 'logout';
      state.restoreStarted = true;
      state.notificationStatus = initialState.notificationStatus;
    },
    loginSuccess(state, action: PayloadAction<{ user: SessionUser; version: number }>) {
      if (state.sessionVersion !== action.payload.version) return;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isSigningIn = false;
      state.isLoggingOut = false;
    },
    sessionFinished(state, action: PayloadAction<number>) {
      if (state.sessionVersion !== action.payload) return;
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isSigningIn = false;
      state.isLoggingOut = false;
    },
    sessionCleared(state) {
      Object.assign(state, initialState, {
        sessionVersion: state.sessionVersion + 1,
        isLoading: false,
        restoreStarted: true,
      });
    },
    notificationStatusChanged(state, action: PayloadAction<string>) {
      state.notificationStatus = action.payload;
    },
  },
});

export const {
  sessionStarted,
  loginSuccess,
  sessionFinished,
  sessionCleared,
  notificationStatusChanged,
} = authSlice.actions;
export const authReducer = authSlice.reducer;
export type AuthRootState = { auth: AuthState };
export const selectCurrentUser = (state: AuthRootState) => state.auth.user;
export const selectAuth = (state: AuthRootState) => state.auth;
