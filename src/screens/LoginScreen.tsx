
import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Colors } from '../theme/colors';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AuthContext } from '../context/AuthContext';

export const LoginScreen = () => {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('LoginScreen must be rendered inside AuthProvider.');
  }

  const { login } = auth;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (): Promise<void> => {
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      await login(email.trim(), password);

      // AuthContext lo token set ayyaka App.tsx
      // automatically main app/dashboard ni chupistundi.
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
    } finally {
      setLoading(false);
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
            EMPLOYEE MANAGEMENT
          </Text>

          <Text style={styles.heading}>
            Welcome back
          </Text>

          <Text style={styles.subheading}>
            Sign in to continue to your dashboard
          </Text>

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
  keyboardContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
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
    fontSize: 24,
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
