import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { Tabs, useRouter } from 'expo-router';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/authSlice';
import { Colors } from '../../theme/colors';
import { TabIcon } from '../../components/TabIcon';

const icons = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  details: 'Employees',
  tasks: 'Tasks',
  attendance: 'Attendance',
  files: 'FileUpload',
  profile: 'Profile',
} as const;
export default function MainTabs() {
  const user = useAppSelector(selectCurrentUser);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const manager = user?.role === 'Manager';
  return (
    <Tabs
      key={`${user?.id}:${user?.employeeId}:${user?.role}`}
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        headerStyle: { backgroundColor: Colors.card },
        headerTintColor: Colors.textDark,
        headerTitle: () => (
          <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
            <AppIcon name="grid" size={20} />
            <Text
              style={{
                color: Colors.ink,
                fontSize: 17,
                fontWeight: '800',
                letterSpacing: -0.5,
              }}
            >
              appzon<Text style={{ color: Colors.primary }}>.</Text>
              <Text style={{ color: Colors.textMuted, fontWeight: '400', fontSize: 11 }}>
                {' '}
                workspace
              </Text>
            </Text>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open my account"
            style={{
              marginRight: 20,
              width: 36,
              height: 36,
              borderRadius: 13,
              backgroundColor: Colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: Colors.primary, fontWeight: '800', fontSize: 13 }}>
              {user?.name.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        ),
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: Colors.background },
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          paddingTop: 9,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 62 + Math.max(insets.bottom, 8),
        },
        tabBarActiveBackgroundColor: Colors.primarySoft,
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 3 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <TabIcon
            name={icons[route.name as keyof typeof icons]}
            color={String(color)}
            size={size}
            focused={focused}
          />
        ),
      })}
    >
      <Tabs.Protected guard={manager}>
        <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="employees" options={{ title: 'Employees' }} />
      </Tabs.Protected>
      <Tabs.Protected guard={!manager}>
        <Tabs.Screen name="details" options={{ title: 'My details' }} />
      </Tabs.Protected>
      <Tabs.Screen name="tasks" options={{ title: manager ? 'Tasks' : 'My tasks' }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Tabs.Screen name="files" options={{ title: manager ? 'Files' : 'My files' }} />
      <Tabs.Screen name="profile" options={{ title: 'Account' }} />
    </Tabs>
  );
}
