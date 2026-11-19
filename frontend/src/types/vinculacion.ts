export type NecesidadVinculacion = {
  id: number;
  titulo: string;
  disponible?: boolean;
};

export type PerfilSolicitanteResumen = {
  nombre: string;
  descripcion?: string | null;
  institucion?: string | null;
  area?: string | null;
  ubicacion?: string | null;
};

export type DatosSolicitudVinculacion = {
  project_need_id: number | null;
  message: string;
  tipo_apoyo: string;
  disponibilidad: string;
  expectativas: string;
  portafolio_url: string;
  github_url: string;
  linkedin_url: string;
  cv_pdf: File | null;
};

export type ErroresSolicitudVinculacion = Partial<
  Record<keyof DatosSolicitudVinculacion, string>
>;


export type EstadoSolicitud = 'pending' | 'accepted' | 'rejected';

export type SolicitudRecibida = {
  id: number;
  project_id: number;
  project_need_id: number | null;
  message: string | null;
  status: EstadoSolicitud;
  created_at: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;

  project?: {
    id: number;
    title: string;
  } | null;

  project_need?: {
    id: number;
    title: string;
  } | null;

  applicant?: {
    id: number;
    name: string;
    display_name?: string | null;
    profile_id?: number | null;
  } | null;

  // Información adicional pendiente de la ampliación de Laravel.
  tipo_apoyo?: string | null;
  disponibilidad?: string | null;
  expectativas?: string | null;
  portafolio_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  cv_url?: string | null;
};

export type SolicitudEnviada = Pick<
  SolicitudRecibida,
  | 'id'
  | 'project_id'
  | 'project_need_id'
  | 'project'
  | 'project_need'
  | 'message'
  | 'status'
  | 'created_at'
  | 'reviewed_at'
  | 'review_notes'
>;