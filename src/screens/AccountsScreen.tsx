import { Button } from '../components/Button';
import { Layout } from '../theme/layout';
import { Colors } from '../theme/colors';
import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, TextInput, Alert, Switch, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../services/api';

type Account = { id: number; email: string; firstName: string; lastName: string;
  role: 'Manager' | 'Employee'; employeeId: number | null; isActive: boolean };
const empty = { email: '', firstName: '', lastName: '', role: 'Employee' as Account['role'], employeeId: '', isActive: true, password: '' };

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(empty);
  const [id, setId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setAccounts((await api.get<Account[]>('/accounts')).data); }
    catch { Alert.alert('Error', 'Could not load login accounts.'); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const payload = { ...form, employeeId: form.employeeId.trim() ? Number(form.employeeId) : null };
      if (id === null) await api.post('/accounts', payload);
      else await api.put(`/accounts/${id}`, payload);
      setForm(empty); setId(null); await load();
      Alert.alert('Saved', 'The login account has been saved. Updated users must sign in again.');
    } catch (error: any) { Alert.alert('Could not save', error?.response?.data?.message ?? 'Check the account details and try again.'); }
    finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>{id === null ? 'Create login account' : 'Edit login account'}</Text>
    <Text>Each employee needs a separate login linked to their employee ID. Existing passwords stay valid.</Text>
    {(['email', 'firstName', 'lastName', 'employeeId', 'password'] as const).map(key => <View key={key}>
      <Text style={styles.label}>{({ email: 'Email', firstName: 'First name', lastName: 'Last name', employeeId: 'Employee ID (required for employees)', password: id === null ? 'Password (6+ characters)' : 'New password (leave blank to keep)' })[key]}</Text>
      <TextInput style={styles.input} value={form[key]} secureTextEntry={key === 'password'}
        autoCapitalize="none" autoCorrect={false} keyboardType={key === 'employeeId' ? 'number-pad' : key === 'email' ? 'email-address' : 'default'}
        onChangeText={value => setForm(old => ({ ...old, [key]: value }))} />
    </View>)}
    <View style={styles.row}><Button title={form.role === 'Manager' ? '✓ Manager' : 'Manager'} onPress={() => setForm({ ...form, role: 'Manager' })} />
      <Button title={form.role === 'Employee' ? '✓ Employee' : 'Employee'} onPress={() => setForm({ ...form, role: 'Employee' })} /></View>
    <View style={styles.row}><Text>Account active</Text><Switch value={form.isActive} onValueChange={isActive => setForm({ ...form, isActive })} /></View>
    <Button title={busy ? 'Saving…' : 'Save account'} disabled={busy} onPress={save} />
    {id !== null && <Button title="Cancel edit" onPress={() => { setId(null); setForm(empty); }} />}
    <Text style={styles.title}>Login accounts</Text>
    {accounts.map(account => <View key={account.id} style={styles.card}>
      <Text>{account.email} · {account.role}</Text><Text>Employee #{account.employeeId ?? '—'} · {account.isActive ? 'Active' : 'Inactive'}</Text>
      <Button title="Edit / reset password" onPress={() => { setId(account.id); setForm({ ...account, employeeId: account.employeeId?.toString() ?? '', password: '' }); }} />
    </View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 20, paddingBottom: 40, gap: 14, backgroundColor: Colors.background }, title: { fontSize: 26, fontWeight: '700', marginTop: 12 },
  label: { marginBottom: 8, fontSize: 13, fontWeight: '600', color: Colors.textDark }, input: { ...Layout.input, backgroundColor: 'white', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }, card: { ...Layout.card, padding: 18, gap: 8 } });
