import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

interface User {
  id: number;
  name: string;
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: Record<string, any>) => Promise<void>;
  register: (data: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getCsrfToken = async () => {
    await api.get('http://localhost:8001/sanctum/csrf-cookie');
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await api.get('/me');
      setUser(response.data.user || response.data);
    } catch {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: Record<string, any>) => {
    await getCsrfToken();
    const response = await api.post('/login', credentials);

    // Extrae el token enviado por Laravel Sanctum
    const token =
      response.data?.token ||
      response.data?.access_token ||
      response.data?.data?.token;

    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const userData =
      response.data?.user ||
      (response.data?.id ? response.data : null);

    if (userData) {
      setUser(userData);
    } else {
      await checkAuth();
    }
  };

  const register = async (data: Record<string, any>) => {
    await getCsrfToken();
    const response = await api.post('/register', data);

    const token =
      response.data?.token ||
      response.data?.access_token ||
      response.data?.data?.token;

    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const userData =
      response.data?.user ||
      (response.data?.id ? response.data : null);

    if (userData) {
      setUser(userData);
    } else {
      await checkAuth();
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};