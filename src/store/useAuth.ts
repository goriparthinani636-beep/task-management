// Screens ki login, logout and shared auth state simple hook dwara isthundi.
import { useCallback } from 'react';
import type { SessionUser } from '../services/employeeScope';
import { login as loginAction, logout as logoutAction } from './authOperations';
import { selectAuth } from './authSlice';
import { useAppDispatch, useAppSelector } from './hooks';
import { retryNotifications } from './AppStateProvider';

export function useAuth() {
  const state = useAppSelector(selectAuth);
  const dispatch = useAppDispatch();
  const login = useCallback(
    (email: string, password: string, role: SessionUser['role']) =>
      dispatch(loginAction(email, password, role)),
    [dispatch],
  );
  const logout = useCallback(() => dispatch(logoutAction()), [dispatch]);
  return { ...state, login, logout, retryNotifications };
}
