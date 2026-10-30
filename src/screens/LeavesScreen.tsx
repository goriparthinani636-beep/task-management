// Employee leave apply chesthadu; manager pending requests approve/reject chesthadu.
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { EmptyState, ScreenHeading } from '../components/ScreenUI';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/authSlice';
import {
  applyLeave,
  leaveErrorMessage,
  LEAVE_TYPES,
  LeaveItem,
  listLeaves,
  reviewLeave,
  validateLeave,
} from '../services/leaves';
import { indiaWorkDate } from '../services/workspaceSummary';
import { Colors } from '../theme/colors';
import { Layout } from '../theme/layout';

export function LeavesScreen() {
  const user = useAppSelector(selectCurrentUser);
  const manager = user?.role === 'Manager';
  const { leaveId } = useLocalSearchParams<{ leaveId?: string }>();
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<string>('Casual');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState<Record<number, string>>({});
  const generation = useRef(0);
  const mutation = useRef(false);

  // Blurred or changed-account screens must not receive an old response.
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const records = await listLeaves();
      if (current === generation.current) {
        setLeaves(records);
        setError('');
      }
    } catch (failure) {
      if (current === generation.current) setError(leaveErrorMessage(failure));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );

  async function submit() {
    const validation = validateLeave(
      startDate,
      endDate,
      reason,
      indiaWorkDate(new Date()),
    );
    if (validation) {
      Alert.alert('Check leave details', validation);
      return;
    }
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    try {
      await applyLeave({ startDate, endDate, leaveType, reason: reason.trim() });
      setStartDate('');
      setEndDate('');
      setReason('');
      Alert.alert('Leave submitted', 'Your request is waiting for manager approval.');
      await load();
    } catch (failure) {
      Alert.alert('Unable to apply', leaveErrorMessage(failure));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function decide(item: LeaveItem, status: 'Approved' | 'Rejected') {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    try {
      const result = await reviewLeave(item.id, status, comments[item.id] || '');
      Alert.alert(
        'Decision saved',
        result.notificationWarning ||
          `Leave ${status.toLowerCase()}. The employee notification has been submitted.`,
      );
      await load();
    } catch (failure) {
      Alert.alert('Unable to save decision', leaveErrorMessage(failure));
      await load();
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        data={leaves}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={Layout.page}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              void load();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.section}>
            <ScreenHeading
              eyebrow="TIME OFF"
              title={manager ? 'Leave requests' : 'My leave'}
              subtitle={
                manager
                  ? 'Review your team’s leave applications.'
                  : 'Apply for leave and track your manager’s decision.'
              }
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {manager ? (
              <Text style={styles.summary}>
                {leaves.filter((item) => item.status === 'Pending').length} pending
                requests
              </Text>
            ) : (
              <View style={styles.card}>
                <Text style={styles.title}>Apply for leave</Text>
                <Text style={styles.muted}>
                  All dates are Indian calendar dates. Days include weekends.
                </Text>
                <Input
                  label="Start date (YYYY-MM-DD)"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-11-02"
                  maxLength={10}
                  editable={!busy}
                />
                <Input
                  label="End date (YYYY-MM-DD)"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-11-03"
                  maxLength={10}
                  editable={!busy}
                />
                <Text style={styles.label}>Leave type</Text>
                <View style={styles.types}>
                  {LEAVE_TYPES.map((type) => (
                    <Button
                      key={type}
                      title={type}
                      variant={leaveType === type ? 'primary' : 'secondary'}
                      disabled={busy}
                      onPress={() => setLeaveType(type)}
                    />
                  ))}
                </View>
                <Input
                  label="Reason"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  maxLength={1000}
                  editable={!busy}
                  placeholder="Why do you need leave?"
                />
                <Button
                  title="Submit leave request"
                  onPress={() => void submit()}
                  loading={busy}
                />
              </View>
            )}
            <Text style={styles.title}>
              {manager ? 'Team applications' : 'Application history'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : !error ? (
            <EmptyState
              icon="task"
              title="No leave requests"
              message={
                manager
                  ? 'Employee requests will appear here.'
                  : 'Your submitted applications will appear here.'
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, String(item.id) === leaveId && styles.highlight]}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.leaveType} leave</Text>
              <Text
                style={[
                  styles.status,
                  {
                    color:
                      item.status === 'Rejected'
                        ? Colors.error
                        : item.status === 'Approved'
                          ? Colors.success
                          : Colors.warning,
                  },
                ]}
              >
                {item.status}
              </Text>
            </View>
            {manager ? (
              <Text style={styles.label}>
                {item.employeeName || `Employee #${item.employeeId}`}
              </Text>
            ) : null}
            <Text style={styles.label}>
              {item.startDate} → {item.endDate}
            </Text>
            <Text style={styles.muted}>
              {item.days} calendar {item.days === 1 ? 'day' : 'days'} · Request #{item.id}
            </Text>
            <Text style={styles.reason}>{item.reason}</Text>
            {item.managerComment ? (
              <Text style={styles.reason}>Manager: {item.managerComment}</Text>
            ) : null}
            {manager && item.status === 'Pending' ? (
              <View style={styles.section}>
                <Input
                  label="Manager comment (optional)"
                  value={comments[item.id] || ''}
                  onChangeText={(value) =>
                    setComments((previous) => ({ ...previous, [item.id]: value }))
                  }
                  maxLength={500}
                  editable={!busy}
                />
                <Button
                  title="Approve leave"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      'Approve leave?',
                      'Save approval and notify the employee?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Approve', onPress: () => void decide(item, 'Approved') },
                      ],
                    )
                  }
                />
                <Button
                  title="Reject leave"
                  variant="secondary"
                  color={Colors.error}
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      'Reject leave?',
                      'Save rejection and notify the employee?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reject',
                          style: 'destructive',
                          onPress: () => void decide(item, 'Rejected'),
                        },
                      ],
                    )
                  }
                />
              </View>
            ) : null}
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  section: { gap: 14 },
  card: { ...Layout.card, padding: 18, gap: 12 },
  title: { fontSize: 19, fontWeight: '700', color: Colors.textDark },
  label: { color: Colors.textDark, fontWeight: '600' },
  muted: { color: Colors.textMuted, lineHeight: 20 },
  reason: { color: Colors.textDark, lineHeight: 22 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  status: { fontWeight: '700' },
  summary: { color: Colors.primary, fontWeight: '700' },
  error: { color: Colors.error },
  highlight: { borderColor: Colors.primary, borderWidth: 2 },
});
