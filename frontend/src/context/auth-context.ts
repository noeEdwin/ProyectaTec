import { createContext, useContext } from 'react';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  account_type: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegistrationData = LoginCredentials & {
  name: string;
  account_type: string;
  password_confirmation: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
}
