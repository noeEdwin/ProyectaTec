import api from './axios';

// Interfaz alineada al modelo y validación de Laravel (Edsai)
export interface UserProfile {
  id?: number;
  display_name: string;
  description?: string;
  phone?: string;
  location?: string;
  institution?: string;
  field_of_study?: string;
  account_type?: string;
  email?: string;
}

export type OrganizationAccess = {
  id: number;
  name: string;
  organization_type: string;
  description?: string | null;
  sector?: string | null;
  location?: string | null;
  role: string;
  status: string;
  can_update: boolean;
};

// Obtener perfil del usuario autenticado (GET /api/me/profile)
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await api.get('/me/profile');
  return response.data.data || response.data.profile || response.data;
};

// Obtener perfil público por ID (GET /api/profiles/:id)
export const getPublicProfile = async (id: number | string): Promise<UserProfile> => {
  const response = await api.get(`/profiles/${id}`);
  return response.data.data || response.data.profile || response.data;
};

// Actualizar perfil del usuario (PATCH /api/me/profile)
export const updateMyProfile = async (data: Partial<UserProfile>): Promise<UserProfile> => {
  const response = await api.patch('/me/profile', data);
  return response.data.data || response.data.profile || response.data;
};

export const getMyOrganizations = async (): Promise<OrganizationAccess[]> => {
  const response = await api.get<{ organizations: OrganizationAccess[] }>('/me/organizations');
  return response.data.organizations;
};
