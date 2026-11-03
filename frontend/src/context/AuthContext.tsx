import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import api from '../api/axios';
import { AuthContext } from './auth-context';
import type { AuthUser, LoginCredentials, RegistrationData } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Estado de bloqueo

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
    setIsLoggingOut(true); // Bloquea interacciones inmediatamente
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Error al notificar al backend del cierre', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setIsLoggingOut(false); // Libera el bloqueo
      window.location.href = '/acceso'; // Redirección fuerte para limpiar estado
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isLoggingOut, 
      login: (data) => authenticate('/login', data), 
      register: (data) => authenticate('/register', data), 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}