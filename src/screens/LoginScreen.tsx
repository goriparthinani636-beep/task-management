import { Layout } from '../theme/layout';

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';

import { Colors } from '../theme/colors';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../store/useAuth';

export const LoginScreen = () => {
  const auth = useAuth();

  const { login, isSigningIn, isLoggingOut } = auth;
  const loading = isSigningIn || isLoggingOut;

  const [role, setRole] = useState<'Manager' | 'Employee'>('Employee');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (): Promise<void> => {
    setRoleMenuOpen(false);
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (loading) {
      return;
    }

    try {
      await login(email.trim(), password, role);

      // Redux authentication state enables the protected tabs.
    } catch (error: unknown) {
      const err = error as {
        message?: string;
        response?: {
          status?: number;
          data?: unknown;
        };
        config?: {
          baseURL?: string;
          url?: string;
        };
        code?: string;
      };

      // Debug information: password/token values log cheyyamu.
      console.log('LOGIN ERROR:', err.message);
      console.log('LOGIN URL:', err.config?.baseURL);
      console.log('LOGIN PATH:', err.config?.url);
      console.log('LOGIN ERROR CODE:', err.code);
      console.log('LOGIN HTTP STATUS:', err.response?.status);

      if (err.response) {
        const responseData = err.response.data;

        const serverMessage =
          typeof responseData === 'string'
            ? responseData
            : JSON.stringify(responseData);

        setErrorMessage(
          `HTTP ${err.response.status}: ${serverMessage}`,
        );
      } else if (
        err.code === 'ECONNABORTED'
      ) {
        setErrorMessage(
          'Request timed out. Please try again.',
        );
      } else {
        setErrorMessage(
          err.code === 'ERR_NETWORK'
            ? 'Unable to connect to the server. Check your internet connection and try again.'
            : err.message ?? 'Unable to sign in. Please try again.',
        );
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.brandTitle}>
            APPZON TECHNOLOGIES
          </Text>

          <Text style={styles.heading}>
            Welcome back
          </Text>

          <Text style={styles.subheading}>
            Sign in as a manager or employee
          </Text>

          <View style={styles.roleSelector}>
            <Text style={styles.roleLabel}>Login as</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Login as ${role}`}
              accessibilityHint="Opens employee and manager login options"
              accessibilityState={{ expanded: roleMenuOpen, disabled: loading }}
              onPress={() => setRoleMenuOpen(open => !open)} disabled={loading}
              style={[styles.roleDropdown, roleMenuOpen && styles.roleDropdownOpen]}>
              <Text style={styles.roleText}>{role} login</Text>
              <Text style={styles.roleArrow} accessible={false}>{roleMenuOpen ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            {roleMenuOpen && <View style={styles.roleMenu}>
              {(['Employee', 'Manager'] as const).map(option => <TouchableOpacity key={option}
                accessibilityRole="radio" accessibilityState={{ checked: role === option }}
                onPress={() => { setRole(option); setRoleMenuOpen(false); setErrorMessage(''); }}
                style={[styles.roleOption, role === option && styles.roleSelected]}>
                <Text style={[styles.roleText, role === option && styles.roleTextSelected]}>{option} login</Text>
                {role === option && <Text style={styles.roleCheck} accessible={false}>✓</Text>}
              </TouchableOpacity>)}
            </View>}
          </View>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
          />

          {errorMessage ? (
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
            >
              {errorMessage}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  roleSelector: { marginBottom: 20 },
  roleLabel: { fontSize: 14, fontWeight: '600', color: Colors.textDark, marginBottom: 6 },
  roleDropdown: { ...Layout.input, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  roleDropdownOpen: { borderColor: Colors.primary },
  roleArrow: { color: Colors.primary, fontSize: 20 },
  roleMenu: { ...Layout.card, marginTop: 6, padding: 4, borderRadius: 12 },
  roleOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8 },
  roleSelected: { backgroundColor: Colors.primarySoft },
  roleText: { color: Colors.textDark, fontWeight: '600', fontSize: 15 },
  roleTextSelected: { color: Colors.primary },
  roleCheck: { color: Colors.primary, fontSize: 18, fontWeight: '700' },
  keyboardContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  card: { ...Layout.card, width: '100%', maxWidth: 460, alignSelf: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.textDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },

  brandTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
  },

  subheading: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },

  errorText: {
    color: Colors.error,
    textAlign: 'center',
    marginTop: 14,
    fontSize: 13,
  },
});
