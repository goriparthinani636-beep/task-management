// Notification permissions, device registration and foreground notification handling.
import { getNativeNotifications } from './nativeNotifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationTaskId, notificationLeaveId } from './notificationTarget';

let foregroundAccount: { id: number; employeeId: number | null } | null = null;
export function setNotificationAccount(
  user: { id: number; employeeId: number | null } | null,
) {
  foregroundAccount = user;
}

getNativeNotifications()?.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner:
      notificationTaskId(notification.request.content.data, foregroundAccount) !== null ||
      notificationLeaveId(notification.request.content.data, foregroundAccount) !== null,
    shouldShowList:
      notificationTaskId(notification.request.content.data, foregroundAccount) !== null ||
      notificationLeaveId(notification.request.content.data, foregroundAccount) !== null,
    shouldPlaySound:
      notificationTaskId(notification.request.content.data, foregroundAccount) !== null ||
      notificationLeaveId(notification.request.content.data, foregroundAccount) !== null,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(
  askPermission = true,
): Promise<string | null> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return null;
  }
  const Notifications = getNativeNotifications();
  if (!Notifications) {
    throw new Error(
      'Task push notifications require the updated APK or a development build.',
    );
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();

  let status = existingPermission.status;

  if (status !== 'granted' && askPermission && existingPermission.canAskAgain) {
    const requestedPermission = await Notifications.requestPermissionsAsync();

    status = requestedPermission.status;
  }

  if (status !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error('Expo project ID is missing.');
  }

  const result = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return result.data;
}
