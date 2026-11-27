import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { ScreenHeading } from '../components/ScreenUI';
import { useAuth } from '../store/useAuth';
import { useCompanyProfile } from '../store/CompanyProfileProvider';
import { api } from '../services/api';
import { Colors } from '../theme/colors';
import { Layout } from '../theme/layout';

export const CompanySetupScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh, setProfile } = useCompanyProfile();
  const [companyName, setCompanyName] = useState('');
  const [managerName, setManagerName] = useState(user?.name ?? '');
  const [managerEmail, setManagerEmail] = useState(user?.email ?? '');
  const [managerPhone, setManagerPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    refresh()
      .then((data) => {
        if (!active || !data) return;
        setCompanyName(data.companyName ?? '');
        setManagerName(data.managerName ?? user?.name ?? '');
        setManagerEmail(data.managerEmail ?? user?.email ?? '');
        setManagerPhone(data.managerPhone ?? '');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refresh, user?.email, user?.name]);

  const save = async () => {
    if (saving) return;
    if (!companyName.trim() || !managerName.trim() || !managerEmail.trim()) {
      Alert.alert('Details required', 'Enter the company name, manager name, and manager email.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.put('/company-profile', {
        companyName: companyName.trim(),
        managerName: managerName.trim(),
        managerEmail: managerEmail.trim(),
        managerPhone: managerPhone.trim() || null,
      });
      setProfile(response.data);
      Alert.alert('Saved', 'Company and manager contact details have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Could not save',
        error?.response?.data?.message ?? 'Company profile storage is not ready yet. Apply the company profile database setup, then try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={Layout.page} keyboardShouldPersistTaps="handled">
        <ScreenHeading
          compact
          eyebrow="WORKSPACE SETTINGS"
          title="Company profile"
          subtitle="Set the company name and the main manager contact shown in your workspace."
        />
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.help}>Loading saved details…</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.section}>Company</Text>
            <Text style={styles.label}>Company name *</Text>
            <TextInput
              accessibilityLabel="Company name"
              placeholder="Enter company name"
              value={companyName}
              onChangeText={setCompanyName}
              maxLength={120}
              style={Layout.input}
              returnKeyType="next"
            />

            <Text style={[styles.section, styles.managerSection]}>Manager contact</Text>
            <Text style={styles.label}>Manager name *</Text>
            <TextInput
              accessibilityLabel="Manager name"
              placeholder="Manager full name"
              value={managerName}
              onChangeText={setManagerName}
              maxLength={120}
              style={Layout.input}
              returnKeyType="next"
            />
            <Text style={styles.label}>Manager email *</Text>
            <TextInput
              accessibilityLabel="Manager email"
              placeholder="manager@example.com"
              value={managerEmail}
              onChangeText={setManagerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={256}
              style={Layout.input}
              returnKeyType="next"
            />
            <Text style={styles.label}>Manager phone (optional)</Text>
            <TextInput
              accessibilityLabel="Manager phone"
              placeholder="Include country code"
              value={managerPhone}
              onChangeText={setManagerPhone}
              keyboardType="phone-pad"
              maxLength={30}
              style={Layout.input}
            />
            <Text style={styles.help}>
              Only managers can view and update these workspace details.
            </Text>
            <View style={styles.actions}>
              <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
              <Button title={saving ? 'Saving…' : 'Save details'} disabled={saving} onPress={() => void save()} />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  loading: { ...Layout.card, alignItems: 'center', padding: 24, gap: 12 },
  card: { ...Layout.card, padding: 20, gap: 10 },
  section: { color: Colors.textDark, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  managerSection: { marginTop: 18 },
  label: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 6 },
  help: { color: Colors.textMuted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
