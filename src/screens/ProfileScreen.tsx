import { AppIcon } from '../components/AppIcon';
import { ScreenHeading } from '../components/ScreenUI';
import { Button } from '../components/Button';
import { Layout } from '../theme/layout';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuth } from '../store/useAuth';
import { api } from '../services/api';
import { Colors } from '../theme/colors';

export const ProfileScreen = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const auth = useAuth();

  const { user, logout, notificationStatus, retryNotifications } = auth;
  const currentUser = user;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const emailText: string = currentUser?.email || '';
  const roleText: string = currentUser?.role || '';
  const initial: string = emailText ? emailText[0].toUpperCase() : 'A';
  const displayName: string = currentUser?.name || emailText.split('@')[0] || 'My account';

  return (
    <ScrollView style={styles.container} contentContainerStyle={Layout.page}>
      <ScreenHeading compact eyebrow="YOUR WORKSPACE" title="My account" subtitle="Your identity, preferences and security." />
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{emailText}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleText}</Text>
        </View>
      </View>

      {user?.role === 'Manager' && <Link href="/accounts" style={{ padding: 18, borderRadius: 14, backgroundColor: Colors.primarySoft, color: Colors.primary, fontWeight: '700' }}>Manage login accounts</Link>}
      {/* Account Details Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Account details</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue}>#{currentUser?.id ?? '—'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{roleText}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Session Status</Text>
          <Text style={[styles.infoValue, { color: Colors.success, fontWeight: '700' }]}>
            Active
          </Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', gap: 10 }}><AppIcon name="shield" size={19} /><Text style={styles.sectionTitle}>Account security</Text></View><Text style={styles.sectionHelp}>Use a password you do not use anywhere else.</Text>
        <TextInput placeholder="Current password" accessibilityLabel="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} autoCapitalize="none" style={[Layout.input, { marginBottom: 12 }]} />
        <TextInput placeholder="New password (6+ characters)" accessibilityLabel="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} autoCapitalize="none" style={Layout.input} />
        <Button title={saving ? 'Saving…' : 'Change password'} disabled={saving} onPress={async () => {
          if (saving) return;
          setSaving(true);
          try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            setCurrentPassword(''); setNewPassword('');
            Alert.alert('Password changed', 'Please sign in using your new password.');
            await logout();
          } catch (error: any) { Alert.alert('Password change failed', error?.response?.data?.message ?? 'Please try again.'); }
          finally { setSaving(false); }
        }} />
      </View>
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', gap: 10 }}><AppIcon name="bell" size={19} /><Text style={styles.sectionTitle}>Stay in the loop</Text></View>
        <Text style={{ marginBottom: 12, color: Colors.textMuted, lineHeight: 22 }}>{notificationStatus}</Text>
        <Button variant="secondary" title="Enable / retry notifications" onPress={() => { void retryNotifications(); }} />
      </View>
      {/* Logout Action */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  sectionHelp: { color: Colors.textMuted, fontSize: 12, lineHeight: 20, marginBottom: 16 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileCard: { ...Layout.card,
    backgroundColor: Colors.ink,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 0,
    elevation: 2,
    shadowColor: Colors.textDark,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#24534B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.card,
    textTransform: 'capitalize',
  },
  userEmail: {
    fontSize: 14,
    color: Colors.onInk,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 12,
  },
  roleText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: { ...Layout.card,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 0,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
  },
  logoutBtn: {
    backgroundColor: Colors.errorSoft,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: Colors.error,
    fontWeight: '700',
    fontSize: 15,
  },
});
