import React, { useContext } from 'react';
import { Tabs } from 'expo-router';
import { AuthContext } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { TabIcon } from '../../components/TabIcon';

const icons = { dashboard: 'Dashboard', employees: 'Employees', details: 'Employees', tasks: 'Tasks',
  attendance: 'Attendance', files: 'FileUpload', profile: 'Profile' } as const;
export default function MainTabs() {
  const { user } = useContext(AuthContext);
  const manager = user?.role === 'Manager';
  return <Tabs key={`${user?.id}:${user?.employeeId}:${user?.role}`} screenOptions={({ route }) => ({ tabBarActiveTintColor: Colors.primary,
    tabBarInactiveTintColor: Colors.textMuted, tabBarLabelStyle: { fontSize: 10 },
    tabBarIcon: ({ color, size, focused }) => <TabIcon name={icons[route.name as keyof typeof icons]} color={String(color)} size={size} focused={focused} /> })}>
    <Tabs.Protected guard={manager}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="employees" options={{ title: 'Employees' }} />
    </Tabs.Protected>
    <Tabs.Protected guard={!manager}><Tabs.Screen name="details" options={{ title: 'My details' }} /></Tabs.Protected>
    <Tabs.Screen name="tasks" options={{ title: manager ? 'Tasks' : 'My tasks' }} />
    <Tabs.Screen name="attendance" options={{ title: 'Attendance' }} />
    <Tabs.Screen name="files" options={{ title: manager ? 'Files' : 'My files' }} />
    <Tabs.Screen name="profile" options={{ title: 'Account' }} />
  </Tabs>;
}
