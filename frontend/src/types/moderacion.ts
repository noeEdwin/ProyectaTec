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