
import React, {
  createContext,
  useEffect,
  useState,
} from 'react';

import { api, onSessionExpired } from '../services/api';
import { secureStorage } from '../storage/secureStorage';
import { validateSessionUser } from '../services/employeeScope';

interface User {
  id: number;
  name: string;
  role: 'Manager' | 'Employee';
  email: string;
  employeeId: number | null;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string, role: 'Manager' | 'Employee') => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType
);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => onSessionExpired(() => {
    setToken(null);
    setUser(null);
  }), []);

  // App start/reopen ayinappudu session restore cheyyadam.
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const savedToken =
          await secureStorage.getAccessToken();

        const savedRefreshToken =
          await secureStorage.getRefreshToken();

        if (!savedToken || !savedRefreshToken) {
          await secureStorage.clearTokens();

          if (mounted) {
            setToken(null);
            setUser(null);
          }

          return;
        }

        // 401 vaste api.ts interceptor refresh try chestundi.
        const response = await api.get('/auth/me');

        const data = response.data;
        const userData = validateSessionUser(data.user ?? data);

        if (mounted) {
          setUser(userData);
          setToken(await secureStorage.getAccessToken());
        }
      } catch (error: any) {
        console.log(
          'Session restore failed:',
          error.response?.status ?? error.message
        );

        // Network/server error ayithe saved tokens preserve chestam.
        // 401 refresh failure ayithe api.ts tokens clear chesuntundi.
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (
    email: string,
    pass: string,
    role: 'Manager' | 'Employee'
  ): Promise<void> => {
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: pass,
        role,
      });

      const data = response.data;

      if (!data.accessToken || !data.refreshToken) {
        throw new Error(
          'The server login response is missing session tokens.'
        );
      }

      // Login response lo user object kuda ravali.
      const userData = validateSessionUser(data.user, email, role);

      await secureStorage.saveTokens(
        data.accessToken,
        data.refreshToken
      );

      setUser(userData);
      setToken(data.accessToken);
    } catch (error: any) {
      let message = 'Login failed. Please try again.';

      if (error.response) {
        message = `HTTP ${error.response.status}: ${
          typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data)
        }`;
      } else if (error.message) {
        message = error.message;
      }

      // Keep one error presentation in LoginScreen, without unmounting its form.
      if (error.response || error.code) throw error;
      throw new Error(message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Backend refresh token revoke cheyyadaniki.
      // Backend logout endpoint available ayithe use avuthundi.
      await api.post('/auth/logout');
    } catch (error: any) {
      console.log(
        'Server logout request failed:',
        error.response?.status ?? error.message
      );
    } finally {
      // Network failure ayina local logout jaragali.
      await secureStorage.clearTokens();
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
