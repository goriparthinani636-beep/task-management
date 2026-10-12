//User email + password enter chestadu → Sign In press chestadu → login() call avutundi → 
// AuthContext backend ki login request pampistundi → success ayithe token save avutundi → 
// App automatically Dashboard ki velthundi.

// src/screens/LoginScreen.tsx
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
  //Ikada LoginScreen ane React component create chestunnam.
  //export ante vere files import chesukovachu.
  const auth = useContext(AuthContext);
  //AuthContext lo unna value ni auth variable lo store cheyyi.
  if (!auth) {
    throw new Error('LoginScreen must be rendered inside AuthProvider.');
  }

  const { login } = auth;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.brandTitle}>EMPLOYEE MANAGEMENT</Text>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to continue to your dashboard</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button title="Sign In" onPress={handleLogin} loading={loading} />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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




//LoginScreen = "User ni login cheyinchu"
//AuthContext = "Login process manage cheyyi"
//api.ts = "Backend tho maatladu"
//secureStorage = "Token ni locker lo pettu"
//App.tsx = "Login/App lo edi chupinchalo decide cheyyi"