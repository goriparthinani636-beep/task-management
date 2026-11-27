import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { AppStateProvider } from '../store/AppStateProvider';
import { useAppSelector } from '../store/hooks';
import { selectAuth } from '../store/authSlice';
import { NotificationNavigation } from '../components/NotificationNavigation';
import { Colors } from '../theme/colors';
import { CompanyProfileProvider } from '../store/CompanyProfileProvider';

function Routes() {
  const { isAuthenticated, user, isLoading } = useAppSelector(selectAuth);
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
        <Stack.Screen name="index" />
        <Stack.Protected guard={isAuthenticated} redirectTo="/">
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected
          guard={isAuthenticated && user?.role === 'Manager'}
          redirectTo="/"
        >
          <Stack.Screen
            name="company-setup"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="accounts"
            options={{ headerShown: true, title: 'Login accounts' }}
          />
        </Stack.Protected>
      </Stack>
      {isLoading && (
        <View
          pointerEvents="auto"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: Colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}
    </>
  );
}
export default function RootLayout() {
  return (
    <AppStateProvider>
      <CompanyProfileProvider>
        <Routes />
      </CompanyProfileProvider>
    </AppStateProvider>
  );
}
