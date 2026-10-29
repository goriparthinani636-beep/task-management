import { AppIcon } from '../components/AppIcon';
import { ScreenHeading, SectionTitle } from '../components/ScreenUI';
import { Layout } from '../theme/layout';
import { Colors } from '../theme/colors';

import React, { useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/authSlice';
import { api } from '../services/api';
import { AttendanceError, getAttendanceOffice, getAttendanceLocation, type Office } from '../services/attendanceLocation';

type AttendanceRecord = { id: number; employeeId: number; employeeName: string; checkedInAt: string; workDate: string };

type AttendanceLocation = {
  latitude: number;
  longitude: number;
};

function getDistanceInMeters(
  pointA: AttendanceLocation,
  pointB: AttendanceLocation,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;

  const dLat = toRadians(pointB.latitude - pointA.latitude);
  const dLon = toRadians(pointB.longitude - pointA.longitude);
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

export default function AttendanceScreen() {
  const user = useAppSelector(selectCurrentUser);
  const isManager = user?.role === 'Manager';
  const [office, setOffice] = useState<Office | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const loadHistory = useCallback(async () => {
    try { setRecords((await api.get('/attendance')).data); setHistoryError(''); }
    catch { setHistoryError('Could not load attendance history.'); }
  }, []);
  useFocusEffect(useCallback(() => { void loadHistory(); }, [loadHistory]));
  const cameraRef = useRef<CameraView>(null);

  const [cameraPermission, requestCameraPermission] =
    useCameraPermissions();

  const [, setLocation] =
    useState<AttendanceLocation | null>(null);

  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  const checkLocation = async () => {
    try {
      const configuredOffice = await getAttendanceOffice();
      setOffice(configuredOffice);
      const current = await getAttendanceLocation();

      const currentLocation = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      const companyLocation = {
        latitude: configuredOffice.latitude,
        longitude: configuredOffice.longitude,
      };

      const meters = getDistanceInMeters(
        currentLocation,
        companyLocation,
      );

      setLocation(currentLocation);
      setDistance(meters);

      if (meters > configuredOffice.radiusMeters) {
        setSelfieUri(null);
        Alert.alert(
          'Outside company location',
          `You are ${Math.round(
            meters,
          )} metres away from the office. Attendance requires being within ${configuredOffice.radiusMeters} metres.`,
        );
        return false;
      }

      return currentLocation;
    } catch (error: any) {
      console.error('Location check failed:', error);
      Alert.alert(
        error instanceof AttendanceError ? error.title : 'Location error',
        error?.message ?? 'Unable to get your current location. Please try again.',
      );
      return false;
    }
  };

  const startAttendance = async () => {
    if (loading) return;
    setLoading(true);
    setSelfieUri(null);
    try {
      const allowed = await checkLocation();
      if (!allowed) return;
      const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!permission.granted) { Alert.alert('Camera permission required', 'Allow camera access to capture your selfie.'); return; }
      setShowCamera(true);
    } finally { setLoading(false); }
  };

  const captureSelfie = async () => {
    if (loading || !cameraRef.current) {
      return;
    }

    try {
      setLoading(true);

      // Recheck location immediately before capturing the selfie.
      const allowed = await checkLocation();

      if (!allowed) {
        setShowCamera(false);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      if (!photo?.uri) {
        throw new Error('Selfie capture failed');
      }

      setSelfieUri(photo.uri);
      setShowCamera(false);
    } catch (error) {
      console.error('Selfie capture failed:', error);
      Alert.alert('Selfie capture failed', 'Unable to capture your selfie. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitAttendance = async () => {
    if (loading) return;
    if (!selfieUri) {
      Alert.alert('Selfie required', 'Please capture a selfie before submitting attendance.');
      return;
    }

    try {
      setLoading(true);

      // Check location again before sending attendance.
      const allowed = await checkLocation();

      if (!allowed) {
        return;
      }

      const formData = new FormData();

      formData.append(
        'selfie',
        {
          uri: selfieUri,
          name: `attendance-${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob,
      );

      formData.append('latitude', String(allowed.latitude));
      formData.append('longitude', String(allowed.longitude));

      await api.post('/attendance', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadHistory();

      Alert.alert('Success', 'Attendance submitted successfully.');
      setSelfieUri(null);
      setLocation(null);
      setDistance(null);
    } catch (error: any) {
      console.error('Attendance submission failed:', error);

      const message =
        error?.response?.data?.message ??
        'Unable to submit attendance. Please check your connection and try again.';

      Alert.alert('Attendance failed', message);
    } finally {
      setLoading(false);
    }
  };

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        />

        <View style={styles.cameraActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowCamera(false)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={captureSelfie}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Capture Selfie</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#ffffff"
            style={styles.loader}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeading eyebrow="WORKSPACE / ATTENDANCE" title="Make today count" subtitle="A quick location check. A selfie. You’re checked in." />
      {(!isManager || user?.employeeId) && <View style={styles.steps}>{[['pin', 'Location'], ['camera', 'Selfie'], ['check', 'Check in']].map(([icon, label], index) => <View key={label} style={styles.step}><View style={[styles.stepIcon, index < (selfieUri ? 3 : distance !== null ? 2 : 1) && { backgroundColor: Colors.primarySoft }]}><AppIcon name={icon as 'pin' | 'camera' | 'check'} size={19} /></View><Text style={styles.stepText}>0{index + 1}  {label}</Text></View>)}</View>}

      {(!isManager || user?.employeeId) && <>
      <View style={styles.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}><AppIcon name="shield" size={19} /><Text style={styles.cardEyebrow}>OFFICE CHECK-IN</Text></View><Text style={styles.infoLabel}>Allowed radius</Text>
        <Text style={styles.infoValue}>{office ? `${office.radiusMeters} metres` : 'Office boundary checked when marking attendance'}</Text>

        {distance !== null && (
          <>
            <Text style={styles.infoLabel}>Distance from company</Text>
            <Text style={styles.infoValue}>
              {Math.round(distance)} metres
            </Text>

            <Text
              style={[
                styles.status,
                distance <= (office?.radiusMeters ?? 500)
                  ? styles.allowed
                  : styles.denied,
              ]}
            >
              {distance <= (office?.radiusMeters ?? 500)
                ? 'Within allowed area'
                : 'Outside allowed area'}
            </Text>
          </>
        )}
      </View>

      {selfieUri && (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: selfieUri }}
            style={styles.preview}
          />
          <Text style={styles.previewLabel}>Selfie captured</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={startAttendance}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          Check Location & Take Selfie
        </Text>
      </TouchableOpacity>

      {selfieUri && (
        <TouchableOpacity
          style={styles.submitButton}
          onPress={submitAttendance}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Submit Attendance</Text>
        </TouchableOpacity>
      )}

      </>}
      <View style={{ marginTop: 28 }}><SectionTitle title={isManager ? 'Team attendance' : 'My check-ins'} detail={records.length + ' RECORDS'} /></View>
      <TouchableOpacity accessibilityRole="button" onPress={loadHistory} style={styles.refreshLink}><Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '700' }}>Refresh check-ins</Text></TouchableOpacity>
      {historyError ? <Text>{historyError}</Text> : records.length === 0 ? <Text>No attendance recorded yet.</Text> : null}
      {records.map(record => <View style={styles.historyCard} key={record.id}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}><AppIcon name="check" size={18} /><Text style={{ fontWeight: '700', color: Colors.textDark, flex: 1 }}>{record.employeeName}</Text><Text style={{ color: Colors.textMuted, fontSize: 11 }}>#{record.employeeId}</Text></View>
        <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 10 }}>{record.workDate} · {new Date(record.checkedInAt).toLocaleTimeString()}</Text>
        <TouchableOpacity onPress={async () => {
          try { setPhoto((await api.get('/attendance/' + record.id + '/selfie')).data.dataUri); }
          catch { Alert.alert('Error', 'Unable to load attendance selfie.'); }
        }}><Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 12, paddingVertical: 10 }}>View attendance selfie</Text></TouchableOpacity>
      </View>)}
      {photo && <TouchableOpacity onPress={() => setPhoto(null)}><Image source={{ uri: photo }} style={styles.preview} /><Text>Close selfie</Text></TouchableOpacity>}
      {loading && (
        <ActivityIndicator
          size="large"
          color="#2563eb"
          style={styles.loader}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 10, marginBottom: 24 }, step: { flex: 1, alignItems: 'center', gap: 9 }, stepIcon: { width: 46, height: 46, backgroundColor: Colors.card, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, stepText: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' }, cardEyebrow: { color: Colors.primary, fontWeight: '800', fontSize: 10, letterSpacing: 1.4 }, historyCard: { ...Layout.card, padding: 18, marginTop: 12 }, refreshLink: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingBottom: 36,
    width: '100%', maxWidth: 1000, alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  infoCard: { ...Layout.card,
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 22,
    marginBottom: 24,
    elevation: 2,
  },
  infoLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  infoValue: {
    color: Colors.textDark,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  status: {
    marginTop: 12,
    fontWeight: '600',
  },
  allowed: {
    color: Colors.success,
  },
  denied: {
    color: Colors.error,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  preview: {
    width: 180,
    height: 180,
    borderRadius: 16,
  },
  previewLabel: {
    marginTop: 8,
    color: Colors.success,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: Colors.success,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: '#475569',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.card,
    fontWeight: '700',
    fontSize: 15,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000000',
  },
  loader: {
    marginTop: 18,
  },
});
