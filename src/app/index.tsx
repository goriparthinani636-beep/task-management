import { Redirect } from 'expo-router';
import { LoginScreen } from '../screens/LoginScreen';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/authSlice';

export default function IndexRoute() {
  const user = useAppSelector(selectCurrentUser);

  if (user) {
    return (
      <Redirect
        href={user.role === 'Manager' ? '/(tabs)/dashboard' : '/(tabs)/details'}
      />
    );
  }

  return <LoginScreen />;
}
