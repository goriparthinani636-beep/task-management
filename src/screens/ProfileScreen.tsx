import { Link } from 'expo-router';
import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Button,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { api } from '../services/api';
import { Colors } from '../theme/colors';

export const ProfileScreen = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const auth = useContext(AuthContext);

  if (!auth) {
    return null;
  }

  const { user, logout } = auth;
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
    <ScrollView style={styles.container}>
      {/* Profile Header Card */}
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

      {user?.role === 'Manager' && <Link href="/accounts" style={{ padding: 16, color: Colors.primary }}>Manage login accounts</Link>}
      {/* Account Details Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Account Details</Text>

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
          <Text style={[styles.infoValue, { color: '#16A34A', fontWeight: '700' }]}>
            Active
          </Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Change password</Text>
        <TextInput placeholder="Current password" accessibilityLabel="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} autoCapitalize="none" style={{ padding: 12 }} />
        <TextInput placeholder="New password (6+ characters)" accessibilityLabel="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} autoCapitalize="none" style={{ padding: 12 }} />
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
      {/* Logout Action */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
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
    color: Colors.textDark,
    textTransform: 'capitalize',
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
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
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
    borderBottomColor: '#F3F4F6',
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
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
});