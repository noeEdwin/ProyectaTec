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
  interest_areas?: string[];
  account_type?: string;
  email?: string;
  campus?: string;
  semester?: string;
  student_number?: string;
  expected_graduation?: string;
  academic_role?: string;
  organization_name?: string;
  organization_id?: number | null;
  organization_area?: string;
  organization_position?: string;
  municipality?: string;
  locality?: string;
  public_fields?: string[];
  affiliation_status?: string;
  affiliation_rejection_reason?: string | null;
  pending_affiliation?: Record<string, string | number | null> | null;
  has_pending_institution_approval?: boolean;
  request_new_institution?: boolean;
  institution_website?: string;
  institution_location?: string;
  institution_email?: string;
  affiliation_reason?: string;
}

export type OrganizationCatalogItem = {
  id: number;
  name: string;
  organization_type: string;
  location: string | null;
};

export type OrganizationAccess = {
  id: number;
  name: string;
  organization_type: string;
  description?: string | null;
  sector?: string | null;
  location?: string | null;
  image?: string | null;
  image_url?: string | null;
  classification?: string;
  role: string;
  status: string;
  can_update: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  email?: string | null;
  phone?: string | null;
  public_fields?: string[];
  legal_name?: string | null;
  website?: string | null;
};

export type OrganizationProfileUpdate = Pick<OrganizationAccess, 'name'> & {
  description?: string | null;
  location?: string | null;
  sector?: string | null;
  email?: string | null;
  phone?: string | null;
  public_fields?: string[];
  legal_name?: string | null;
  website?: string | null;
};

export type OrganizationPublicProject = {
  id: number;
  title: string;
  description: string;
  status: string;
  modality: string | null;
  location: string | null;
  cover_image_url?: string | null;
  created_at: string | null;
  category?: { id: number; name: string } | null;
};

export type OrganizationPublicDirectoryItem = {
  id: number;
  name: string;
  organization_type: string;
  sector: string | null;
  description: string | null;
  location: string | null;
  image_url: string | null;
  projects_count: number;
};

export type OrganizationPublicProfile = {
  id: number;
  is_organization: true;
  name: string;
  organization_type?: string;
  sector?: string | null;
  website?: string | null;
  description: string | null;
  location: string | null;
  image: string | null;
  image_url: string | null;
  classification: string;
  projects?: OrganizationPublicProject[];
  contact?: { email: string | null; phone: string | null };
};

export type PendingOrganization = {
  id: number;
  name: string;
  legal_name: string | null;
  website: string | null;
  organization_type: string;
  sector: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  description?: string | null;
  public_fields?: string[];
  logo_url?: string | null;
  members_count?: number;
  applicant?: {
    id: number;
    name: string;
    email: string;
    account_type: string;
  } | null;
  created_at: string;
};

export type PendingOwnershipRequest = {
  id: number;
  organization_id: number;
  organization_name: string;
  organization_type: string;
  organization_location: string | null;
  user_id: number;
  user_name: string;
  user_email: string;
  account_type: string;
  request_note: string | null;
  created_at: string | null;
};

export type PendingAffiliation = {
  id: number;
  user_name: string;
  user_email: string;
  account_type: string;
  current_institution?: string | null;
  current_organization_name?: string | null;
  pending_affiliation: Record<string, string | number | null>;
  updated_at: string;
};

export type OrganizationRoleRequest = {
  id: number;
  organization_id: number;
  organization_name: string;
  role: string;
  requested_role: string | null;
  status: string;
  request_note: string | null;
  rejection_reason: string | null;
  updated_at: string | null;
};

export type OrganizationMemberRequest = {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  account_type: string;
  role: string;
  requested_role: string;
  status: string;
  request_note: string | null;
  updated_at: string | null;
};

export type OrganizationActiveMember = {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role: string;
  joined_at: string | null;
};

export type AdminCreateOrganizationPayload = {
  name: string;
  organization_type?: 'empresa' | 'institucion_educativa' | 'sector_social';
  sector?: string;
  location?: string;
  website?: string;
  email?: string;
  phone?: string;
  legal_name?: string;
  description?: string;
};

// Obtener el perfil editable del usuario autenticado, incluyendo valores iniciales
// basados en la cuenta si todavía no existe un registro Profile.
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await api.get('/profile');
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

export const getOrganizationCatalog = async (): Promise<OrganizationCatalogItem[]> => {
  const response = await api.get<{ organizations: OrganizationCatalogItem[] }>('/organizations/catalog');
  return response.data.organizations;
};

export const updateOrganizationProfile = async (
  id: number,
  data: OrganizationProfileUpdate,
): Promise<void> => {
  await api.patch(`/organizations/${id}`, data);
};

export const getPublicOrganizations = async (params?: {
  q?: string;
  type?: string;
}): Promise<OrganizationPublicDirectoryItem[]> => {
  const response = await api.get<{ organizations: OrganizationPublicDirectoryItem[] }>('/organizations', {
    params: {
      ...(params?.q?.trim() ? { q: params.q.trim() } : {}),
      ...(params?.type?.trim() ? { type: params.type.trim() } : {}),
    },
  });
  return response.data.organizations;
};

export const getPublicOrganizationProfile = async (id: number): Promise<OrganizationPublicProfile> => {
  const response = await api.get<{ organization: OrganizationPublicProfile }>(`/organizations/${id}`);
  return response.data.organization;
};

export const getPendingOrganizations = async (): Promise<PendingOrganization[]> => {
  const response = await api.get<{ organizations: PendingOrganization[] }>('/admin/organizations/pending');
  return response.data.organizations;
};

export const getPendingAdminOrganizationQueue = async (): Promise<{
  organizations: PendingOrganization[];
  ownership_requests: PendingOwnershipRequest[];
}> => {
  const response = await api.get<{
    organizations: PendingOrganization[];
    ownership_requests?: PendingOwnershipRequest[];
  }>('/admin/organizations/pending');
  return {
    organizations: response.data.organizations ?? [],
    ownership_requests: response.data.ownership_requests ?? [],
  };
};

export const reviewOrganization = async (id: number, approval_status: 'approved' | 'rejected', rejection_reason?: string): Promise<void> => {
  await api.patch(`/admin/organizations/${id}/approval`, { approval_status, rejection_reason });
};

export const resubmitOrganization = async (id: number): Promise<void> => {
  await api.post(`/organizations/${id}/resubmit`);
};

export const getPendingAffiliations = async (): Promise<PendingAffiliation[]> => {
  const response = await api.get<{ profiles: PendingAffiliation[] }>('/admin/profiles/affiliations/pending');
  return response.data.profiles;
};

export const reviewAffiliation = async (id: number, decision: 'approved' | 'rejected', reason?: string): Promise<void> => {
  await api.patch(`/admin/profiles/${id}/affiliation`, { decision, reason });
};

export const adminCreateOrganization = async (payload: AdminCreateOrganizationPayload): Promise<{ id: number; name: string }> => {
  const response = await api.post<{ organization: { id: number; name: string } }>('/admin/organizations', payload);
  return response.data.organization;
};

export const getMyOrganizationRoleRequests = async (): Promise<OrganizationRoleRequest[]> => {
  const response = await api.get<{ role_requests: OrganizationRoleRequest[] }>('/me/organization-role-requests');
  return response.data.role_requests;
};

export const requestOrganizationRole = async (
  organizationId: number,
  payload: { role: 'member' | 'admin'; note?: string },
): Promise<void> => {
  await api.post(`/organizations/${organizationId}/role-request`, payload);
};

export const getOrganizationMemberRequests = async (
  organizationId: number,
): Promise<{
  requests: OrganizationMemberRequest[];
  members: OrganizationActiveMember[];
  affiliation_requests: PendingAffiliation[];
}> => {
  const response = await api.get<{
    requests: OrganizationMemberRequest[];
    members: OrganizationActiveMember[];
    affiliation_requests: PendingAffiliation[];
  }>(`/organizations/${organizationId}/member-requests`);
  return response.data;
};

export const reviewOrganizationMemberRequest = async (
  organizationId: number,
  membershipId: number,
  decision: 'approved' | 'rejected',
  reason?: string,
): Promise<void> => {
  await api.patch(`/organizations/${organizationId}/member-requests/${membershipId}`, { decision, reason });
};

export const reviewOrganizationAffiliationRequest = async (
  organizationId: number,
  profileId: number,
  decision: 'approved' | 'rejected',
  reason?: string,
): Promise<void> => {
  await api.patch(`/organizations/${organizationId}/affiliation-requests/${profileId}`, { decision, reason });
};
