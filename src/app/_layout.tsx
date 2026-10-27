import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { AuthContext, AuthProvider } from '../context/AuthContext';

function Routes() {
  const { token, user, isLoading } = useContext(AuthContext);
  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>;
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!token}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={!!token}><Stack.Screen name="(tabs)" /></Stack.Protected>
    <Stack.Protected guard={!!token && user?.role === 'Manager'}>
      <Stack.Screen name="accounts" options={{ headerShown: true, title: 'Login accounts' }} />
    </Stack.Protected>
  </Stack>;
}
export default function RootLayout() { return <AuthProvider><Routes /></AuthProvider>; }
