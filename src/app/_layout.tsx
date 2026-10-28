import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { AuthContext, AuthProvider } from '../context/AuthContext';
import { NotificationNavigation } from '../components/NotificationNavigation';
import { Colors } from '../theme/colors';

function Routes() {
  const { token, user, isLoading } = useContext(AuthContext);
  if (isLoading) return <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={Colors.primary} /></View>;
  return <><NotificationNavigation /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background }, headerStyle: { backgroundColor: Colors.card }, headerTintColor: Colors.textDark, headerShadowVisible: false }}>
    <Stack.Protected guard={!token}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={!!token}><Stack.Screen name="(tabs)" /></Stack.Protected>
    <Stack.Protected guard={!!token && user?.role === 'Manager'}>
      <Stack.Screen name="accounts" options={{ headerShown: true, title: 'Login accounts' }} />
    </Stack.Protected>
  </Stack></>;
}
export default function RootLayout() { return <AuthProvider><Routes /></AuthProvider>; }
