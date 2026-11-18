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
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { EmptyState, ScreenHeading, SearchField } from '../components/ScreenUI';
import { AppIcon } from '../components/AppIcon';
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
import { useFormKeyboard } from '../hooks/useFormKeyboard';

function statusPillStyle(status: LeaveItem['status']) {
  if (status === 'Approved') return styles.approvedStatus;
  if (status === 'Rejected') return styles.rejectedStatus;
  return styles.pendingStatus;
}

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | LeaveItem['status']>('All');
  const leaveInputProps = useFormKeyboard(3);
  const commentInputProps = useFormKeyboard(1);
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

  const visibleLeaves = leaves.filter((item) => {
    if (statusFilter !== 'All' && item.status !== statusFilter) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [
      item.employeeName,
      item.employeeId,
      item.id,
      item.leaveType,
      item.startDate,
      item.endDate,
      item.reason,
      item.status,
      item.managerComment,
    ].some((value) => String(value ?? '').toLowerCase().includes(needle));
  });
  const leaveCounts = {
    All: leaves.length,
    Pending: leaves.filter((item) => item.status === 'Pending').length,
    Approved: leaves.filter((item) => item.status === 'Approved').length,
    Rejected: leaves.filter((item) => item.status === 'Rejected').length,
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        automaticallyAdjustKeyboardInsets
        data={visibleLeaves}
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
              <View style={styles.summaryCard}>
                <View style={styles.summaryMark} />
                <View>
                  <Text style={styles.summaryCount}>{leaveCounts.Pending} waiting</Text>
                  <Text style={styles.muted}>Team requests need your review</Text>
                </View>
              </View>
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
                  {...leaveInputProps[0]}
                />
                <Input
                  label="End date (YYYY-MM-DD)"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-11-03"
                  maxLength={10}
                  editable={!busy}
                  {...leaveInputProps[1]}
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
                  {...leaveInputProps[2]}
                  returnKeyType="default"
                  submitBehavior="newline"
                  onSubmitEditing={undefined}
                />
                <Button
                  title="Submit leave request"
                  onPress={() => void submit()}
                  loading={busy}
                />
              </View>
            )}
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder={manager ? 'Search employee, date, or request…' : 'Search leave history…'}
            />
            <View style={styles.filterRow}>
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  accessibilityRole="button"
                  accessibilityState={{ selected: statusFilter === filter }}
                  onPress={() => setStatusFilter(filter)}
                  style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>
                    {filter} <Text style={statusFilter === filter ? styles.filterCountActive : styles.filterCount}>({leaveCounts[filter]})</Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
              title={search || statusFilter !== 'All' ? 'No matching requests' : 'No leave requests'}
              message={
                search || statusFilter !== 'All'
                  ? 'Try a different search or status filter.'
                  : manager
                  ? 'Employee requests will appear here.'
                  : 'Your submitted applications will appear here.'
              }
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={[styles.card, String(item.id) === leaveId && styles.highlight]}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.leaveType} leave</Text>
              <Text style={[styles.status, statusPillStyle(item.status)]}>
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
                  {...commentInputProps[0]}
                />
                <View style={styles.decisionRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  style={[styles.decisionButton, styles.approveButton, busy && styles.disabled]}
                  onPress={() =>
                    Alert.alert('Approve leave?', 'Save approval and notify the employee?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Approve', onPress: () => void decide(item, 'Approved') },
                    ])
                  }
                >
                  <AppIcon name="check" size={17} color={Colors.success} />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  style={[styles.decisionButton, styles.rejectButton, busy && styles.disabled]}
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
                >
                  <AppIcon name="close" size={17} color={Colors.error} />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                </View>
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
  status: {
    overflow: 'hidden',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  pendingStatus: { color: Colors.warning, backgroundColor: Colors.warningSoft },
  approvedStatus: { color: Colors.success, backgroundColor: Colors.successSoft },
  rejectedStatus: { color: Colors.error, backgroundColor: Colors.errorSoft },
  summaryCard: {
    ...Layout.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryMark: { width: 8, height: 40, borderRadius: 4, backgroundColor: Colors.warning },
  summaryCount: { color: Colors.textDark, fontSize: 17, fontWeight: '800', marginBottom: 3 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterChipActive: { borderColor: Colors.ink, backgroundColor: Colors.ink },
  filterText: { color: Colors.textMuted, fontWeight: '700', fontSize: 11 },
  filterTextActive: { color: Colors.card },
  filterCount: { color: Colors.textMuted, fontWeight: '500' },
  filterCountActive: { color: Colors.onInk, fontWeight: '500' },
  decisionRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  decisionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  approveButton: { backgroundColor: Colors.successSoft, borderColor: '#BCE6CE' },
  rejectButton: { backgroundColor: Colors.errorSoft, borderColor: '#F3D0D0' },
  approveText: { color: Colors.success, fontSize: 13, fontWeight: '800' },
  rejectText: { color: Colors.error, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  error: { color: Colors.error },
  highlight: { borderColor: Colors.primary, borderWidth: 2 },
});
