import { useEffect, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import api from '../api/axios';
import { AuthContext } from './auth-context';
import type { AuthUser, LoginCredentials, RegistrationData } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    void api.get<AuthUser>('/me')
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(path: '/login' | '/register', data: LoginCredentials | RegistrationData) {
    const response = await api.post<{ access_token: string }>(path, data);
    const token = response.data.access_token;

    if (!token) throw new Error('El servidor no devolvió un token de acceso.');

    localStorage.setItem('token', token);

    try {
      const result = await api.get<AuthUser>('/me');
      setUser(result.data);
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
      throw error;
    }
  }

  async function logout() {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login: (data) => authenticate('/login', data), register: (data) => authenticate('/register', data), logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para consumir la autenticación en cualquier componente
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
}