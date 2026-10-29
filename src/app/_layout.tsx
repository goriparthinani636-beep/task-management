import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { AppStateProvider } from '../store/AppStateProvider';
import { useAppSelector } from '../store/hooks';
import { selectAuth } from '../store/authSlice';
import { NotificationNavigation } from '../components/NotificationNavigation';
import { Colors } from '../theme/colors';

function Routes() {
  const { isAuthenticated, user, isLoading } = useAppSelector(selectAuth);
  if (isLoading)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  return (
    <>
      <NotificationNavigation />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.textDark,
          headerShadowVisible: false,
        }}
      >
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated && user?.role === 'Manager'}>
          <Stack.Screen
            name="accounts"
            options={{ headerShown: true, title: 'Login accounts' }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}
export default function RootLayout() {
  return (
    <AppStateProvider>
      <Routes />
    </AppStateProvider>
  );
}
