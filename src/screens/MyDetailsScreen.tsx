import React, { useCallback, useContext, useRef, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import { loadMyEmployee } from '../services/employeeScope';
import type { Employee } from './EmployeesScreen';

export default function MyDetailsScreen() {
  const { user } = useContext(AuthContext);
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
      if (generation.current === current) setError(error?.message ?? 'Unable to load your details. Pull down to retry.');
    } finally { if (generation.current === current) setLoading(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  return <ScrollView style={styles.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
    <Text style={styles.title}>My details</Text>
    {error ? <Text>{error}</Text> : null}
    {employee && Object.entries({ Name: `${employee.firstName} ${employee.lastName}`, Email: employee.email,
      Phone: employee.phone, Department: employee.department, Designation: employee.designation,
      Status: employee.status, 'Joining date': employee.joiningDate?.slice(0, 10) }).map(([label, value]) =>
      <View key={label} style={styles.row}><Text>{label}</Text><Text style={styles.value}>{value || '—'}</Text></View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  row: { padding: 16, backgroundColor: 'white', marginBottom: 8, borderRadius: 8 }, value: { fontWeight: '600', marginTop: 6 } });
