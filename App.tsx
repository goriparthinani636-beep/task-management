// App.tsx
import React, { useContext } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext, AuthProvider } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { EmployeesScreen } from './src/screens/EmployeesScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { FileUploadScreen } from './src/screens/FileUploadScreen';
import { Colors } from './src/theme/colors';
import { TabIcon } from './src/components/TabIcon';

type MainTabParamList = {
  Dashboard: undefined;
  Employees: undefined;
  Tasks: undefined;
  Profile: undefined;
  FileUpload: undefined;
};

type RootStackParamList = {
  Login: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size, focused }) => (
        <TabIcon name={route.name} color={color} size={size} focused={focused} />
      ),
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      headerStyle: { backgroundColor: Colors.card },
      headerTitleStyle: { fontWeight: '700', color: Colors.textDark },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} /> 
    <Tab.Screen name="Employees" component={EmployeesScreen} />
    <Tab.Screen name="Tasks" component={TasksScreen} /> 
    <Tab.Screen name="Profile" component={ProfileScreen} />
    <Tab.Screen name="FileUpload" component={FileUploadScreen} options={{ title: 'Files' }} />
  </Tab.Navigator>
);

const Navigation = () => {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('Navigation must be rendered inside AuthProvider.');
  }

  const { token, isLoading } = auth;
//
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token == null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="App" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textDark },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
});
