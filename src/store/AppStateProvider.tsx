// App ki Redux store connect chesi session and notifications lifecycle manage chesthundi.
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { Provider } from 'react-redux';
import { api, onSessionExpired, resetApiSession } from '../services/api';
import { validateSessionUser } from '../services/employeeScope';
import { createNotificationRegistration } from '../services/notificationRegistration';
import { getNativeNotifications } from '../services/nativeNotifications';
import { setNotificationAccount } from '../services/notifications';
import { secureStorage } from '../storage/secureStorage';
import { createAppStore } from './store';
import { useAppDispatch, useAppSelector } from './hooks';
import {
  notificationStatusChanged,
  selectCurrentUser,
  sessionCleared,
} from './authSlice';
import { restoreSession } from './authOperations';

const deviceSession = createNotificationRegistration((message) => {
  store.dispatch(notificationStatusChanged(message));
});

export const store = createAppStore({
  api,
  storage: secureStorage,
  validateUser: validateSessionUser,
  resetApiSession,
  stopNotifications: () => {
    deviceSession.stop();
    setNotificationAccount(null);
    void getNativeNotifications()
      ?.dismissAllNotificationsAsync()
      .catch(() => {});
  },
});

export const retryNotifications = () => deviceSession.sync(true);

function SessionLifecycle() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  useEffect(
    () =>
      onSessionExpired(() => {
        deviceSession.stop();
        setNotificationAccount(null);
        dispatch(sessionCleared());
      }),
    [dispatch],
  );
  useEffect(() => {
    void dispatch(restoreSession());
  }, [dispatch]);
  useEffect(() => {
    setNotificationAccount(user);
    if (!user) {
      deviceSession.stop();
      return;
    }
    deviceSession.activate(user.id);
    void deviceSession.sync(true);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') void deviceSession.sync();
    });
    const rotation = getNativeNotifications()?.addPushTokenListener(() => {
      void deviceSession.sync();
    });
    return () => {
      deviceSession.stop();
      foreground.remove();
      rotation?.remove();
    };
  }, [user]);
  return null;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionLifecycle />
      {children}
    </Provider>
  );
}
