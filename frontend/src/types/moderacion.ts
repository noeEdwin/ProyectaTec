export type TipoPublicacionModeracion = 'proyecto' | 'necesidad';

export type UsuarioModeracion = {
  id: number;
  name: string;
  email: string;
  account_type: string;
  is_active: boolean;
  created_at: string;
};

export type PublicacionModeracion = {
  id: number;
  type: TipoPublicacionModeracion;
  title: string;
  author_name: string;
  is_hidden: boolean;
  created_at: string;
};

export type EstadoReporte = 'pending' | 'reviewed' | 'discarded';

/** Igual que PublicationReportResource. Un reporte es de un proyecto O de una necesidad. */
export type ReporteModeracion = {
  id: number;
  reporter_id: number;
  project_id: number | null;
  community_need_id: number | null;
  reason: string;
  details: string | null;
  status: EstadoReporte;
  reviewed_by: number | null;
  reviewed_at: string | null;
  decision_notes: string | null;
  created_at: string;
};

export type MetaPaginacion = {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
};

export type ListaReportes = {
  reports: ReporteModeracion[];
  meta: MetaPaginacion;
};

export type PublicacionDetalleModeracion = {
  id: number;
  type: TipoPublicacionModeracion;
  title: string;
  description: string | null;
  status: string;
  is_hidden: boolean;
  modality: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cover_image_url?: string | null;
  gallery_urls?: string[];
  category: {
    id: number;
    name: string;
    sector: string | null;
  } | null;
  organization: {
    id: number;
    name: string;
    organization_type: string;
    location: string | null;
    approval_status: string;
  } | null;
  author: {
    id: number;
    name: string;
    email: string;
    account_type: string;
    is_active: boolean;
    institution: string | null;
    organization_name: string | null;
  } | null;
  needs: Array<{
    id: number;
    title: string;
    description: string | null;
    required_profile: string | null;
    openings: number;
    status: string;
  }>;
  applications_count: number;
  reports: Array<{
    id: number;
    reason: string;
    details: string | null;
    status: EstadoReporte;
    decision_notes: string | null;
    created_at: string | null;
    reporter: {
      id: number;
      name: string;
      email: string;
    } | null;
  }>;
  created_at: string | null;
  updated_at: string | null;
};

export type UsuarioDetalleModeracion = {
  id: number;
  name: string;
  email: string;
  account_type: string;
  is_active: boolean;
  created_at: string;
  profile: {
    display_name: string | null;
    description: string | null;
    phone: string | null;
    location: string | null;
    institution: string | null;
    campus: string | null;
    field_of_study: string | null;
    interest_areas: string[];
    semester: string | null;
    student_number: string | null;
    expected_graduation: string | null;
    academic_role: string | null;
    organization_name: string | null;
    organization_area: string | null;
    organization_position: string | null;
    municipality: string | null;
    locality: string | null;
    affiliation_status: string | null;
  } | null;
  organizations: Array<{
    id: number;
    name: string;
    organization_type: string | null;
    approval_status: string | null;
    role: string;
    status: string;
  }>;
  projects: Array<{
    id: number;
    type: 'proyecto';
    title: string;
    status: string;
    is_hidden: boolean;
    created_at: string | null;
  }>;
  community_needs: Array<{
    id: number;
    type: 'necesidad';
    title: string;
    status: string;
    is_hidden: boolean;
    created_at: string | null;
  }>;
  stats: {
    projects_count: number;
    community_needs_count: number;
    reports_made_count: number;
    reports_received_count: number;
  };
};