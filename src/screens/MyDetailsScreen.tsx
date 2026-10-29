// My details: signed-in employee ki link aina profile matrame load chesthundi.
import { AppIcon, type IconName } from '../components/AppIcon';
import { ScreenHeading, EmptyState, SectionTitle } from '../components/ScreenUI';
import { Layout } from '../theme/layout';
import { Colors } from '../theme/colors';
import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/authSlice';
import { loadMyEmployee } from '../services/employeeScope';
import type { Employee } from './EmployeesScreen';

export default function MyDetailsScreen() {
  const user = useAppSelector(selectCurrentUser);
  const generation = useRef(0);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setEmployee(null);
    setError('');
    setLoading(true);
    try {
      if (!user) return;
      const data = await loadMyEmployee(user);
      if (generation.current === current) setEmployee(data);
    } catch (error: any) {
      if (generation.current === current)
        setError(error?.message ?? 'Unable to load your details. Pull down to retry.');
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, [user]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  const fields: [string, string | undefined, IconName][] = employee
    ? [
        ['Email address', employee.email, 'mail'],
        ['Phone number', employee.phone, 'users'],
        ['Department', employee.department, 'grid'],
        ['Designation', employee.designation, 'task'],
        ['Employee status', employee.status, 'shield'],
        ['Joining date', employee.joiningDate?.slice(0, 10), 'clock'],
      ]
    : [];
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={load}
          tintColor={Colors.primary}
        />
      }
    >
      <ScreenHeading
        eyebrow="YOUR WORKSPACE"
        title="My details"
        subtitle="The person behind the progress."
      />
      {!!error && (
        <View style={styles.error}>
          <Text style={{ color: Colors.error, lineHeight: 21 }}>{error}</Text>
        </View>
      )}
      {employee ? (
        <>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.initial}>
                {employee.firstName.charAt(0).toUpperCase()}
                {employee.lastName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>
              {employee.firstName} {employee.lastName}
            </Text>
            <Text style={styles.designation}>
              {employee.designation || 'Team member'}
            </Text>
            <View style={styles.idBadge}>
              <AppIcon name="shield" size={14} color={Colors.mint} />
              <Text style={styles.idText}>EMPLOYEE #{employee.id}</Text>
            </View>
          </View>
          <SectionTitle title="Your information" detail="EMPLOYEE PROFILE" />
          <View style={styles.details}>
            {fields.map(([label, value, icon], index) => (
              <View
                key={label}
                style={[
                  styles.row,
                  index === fields.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.icon}>
                  <AppIcon name={icon} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{value || 'Not provided'}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.note}>
            Need to update your information? Contact your manager.
          </Text>
        </>
      ) : !loading && !error ? (
        <EmptyState
          icon="users"
          title="Profile not available"
          message="Pull down to reload your employee information."
        />
      ) : null}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  content: { ...Layout.page, gap: 0 },
  hero: {
    backgroundColor: Colors.ink,
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 26,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: '#24534B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  initial: { color: Colors.mint, fontSize: 26, fontWeight: '800' },
  name: { fontSize: 25, color: Colors.card, fontWeight: '800', textAlign: 'center' },
  designation: { color: Colors.onInk, fontSize: 13, marginTop: 7 },
  idBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  idText: { color: Colors.onInk, fontSize: 10, letterSpacing: 1.3, fontWeight: '600' },
  details: { ...Layout.card, paddingHorizontal: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 10, color: Colors.textMuted, marginBottom: 6 },
  value: { fontSize: 14, fontWeight: '600', color: Colors.textDark, lineHeight: 20 },
  note: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 19,
    marginTop: 20,
  },
  error: {
    backgroundColor: Colors.errorSoft,
    padding: 16,
    borderRadius: 14,
    marginBottom: 18,
  },
});
