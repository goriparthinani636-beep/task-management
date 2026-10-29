// Office coordinates, device location and attendance distance validation.
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { api } from './api';

export type Office = { latitude: number; longitude: number; radiusMeters: number };
export class AttendanceError extends Error {
  constructor(
    public title: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getAttendanceOffice(): Promise<Office> {
  try {
    const office: Office = (await api.get('/attendance/office')).data;
    if (
      !office ||
      !Number.isFinite(office.latitude) ||
      !Number.isFinite(office.longitude) ||
      Math.abs(office.latitude) > 90 ||
      Math.abs(office.longitude) > 180 ||
      !Number.isFinite(office.radiusMeters) ||
      office.radiusMeters <= 0
    ) {
      throw new AttendanceError(
        'Attendance setup error',
        'The server returned an invalid office location. Contact your manager.',
      );
    }
    return office;
  } catch (error: any) {
    if (error instanceof AttendanceError) throw error;
    if (error?.response?.status === 404)
      throw new AttendanceError(
        'Attendance service unavailable',
        'The live backend does not have the attendance API. Deploy the updated EmployeeApi backend first.',
      );
    throw new AttendanceError(
      'Attendance server error',
      error?.response?.data?.message ??
        'Unable to connect to the attendance server. Check your connection and try again.',
    );
  }
}

export async function getAttendanceLocation(): Promise<Location.LocationObject> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new AttendanceError(
      'Location permission required',
      'Allow precise location for EmployeeApp in your phone settings, then try again.',
    );
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    if (Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
      } catch {
        /* Explain below if location stays disabled. */
      }
    }
    if (!(await Location.hasServicesEnabledAsync()))
      throw new AttendanceError(
        'Location is switched off',
        'Turn on phone Location and Google Location Accuracy, then try again.',
      );
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('GPS timeout')), 20000);
      }),
    ]);
  } catch {
    // Accept only a recent, accurate fix when a new GPS fix fails indoors.
    const recent = await Location.getLastKnownPositionAsync({
      maxAge: 15000,
      requiredAccuracy: 100,
    }).catch(() => null);
    if (
      recent &&
      Date.now() - recent.timestamp <= 15000 &&
      recent.coords.accuracy !== null &&
      recent.coords.accuracy <= 100
    )
      return recent;
    throw new AttendanceError(
      'Unable to get GPS location',
      'Enable precise location and Google Location Accuracy. Move near a window or outdoors and try again.',
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
