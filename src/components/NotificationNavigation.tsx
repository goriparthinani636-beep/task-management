import { useContext, useEffect, useRef } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import type * as Notifications from 'expo-notifications';
import { getNativeNotifications } from '../services/nativeNotifications';
import { AuthContext } from '../context/AuthContext';
import { notificationTaskId } from '../services/notificationTarget';

export function NotificationNavigation() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const navigation = useRootNavigationState();
  const handled = useRef(new Set<string>());
  useEffect(() => {
    if (!navigation?.key || !user) return;
    const nativeNotifications = getNativeNotifications();
    if (!nativeNotifications) return;
    const handle = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handled.current.has(id)) return;
      const taskId = notificationTaskId(response.notification.request.content.data, user);
      handled.current.add(id);
      if (handled.current.size > 100) handled.current.delete(handled.current.values().next().value!);
      if (taskId !== null) router.push({ pathname: '/(tabs)/tasks', params: { taskId: String(taskId) } });
      void nativeNotifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    let mounted = true;
    const subscription = nativeNotifications.addNotificationResponseReceivedListener(handle);
    void nativeNotifications.getLastNotificationResponseAsync().then(response => {
      if (mounted && response) handle(response);
    }).catch(() => {});
    return () => { mounted = false; subscription.remove(); };
  }, [navigation?.key, router, user]);
  return null;
}
