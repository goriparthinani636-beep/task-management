//Idi AuthContext.tsx file. Idi mana app lo login ayyada? evaru login ayyaru? token enti? 
// logout ela cheyyali? ane authentication information ni app motham ki share chestundi.

import React, { createContext, useState } from 'react';
import { Alert } from 'react-native';
//Alert ante mobile popup message.
import { api } from '../services/api';
//Mana api.ts file nundi Axios instance import chestunnam.

interface User {
  id: number;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}
//idi AuthContext lo em information/functions untayo define chestundi.

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      // Sends POST request to ASP.NET Core API at /api/auth/login
      const response = await api.post('/auth/login', {
        email: email,
        password: pass,
      });

      const data = response.data;
      setToken(data.accessToken);
      setUser(data.user);
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Login failed. Please check backend connection.';
      Alert.alert('Authentication Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};




