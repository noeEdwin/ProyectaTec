import axios from 'axios';
import api from './axios';
import type {
  EstadoReporte,
  ListaReportes,
  MetaPaginacion,
  PublicacionModeracion,
  ReporteModeracion,
  TipoPublicacionModeracion,
  UsuarioModeracion,
} from '../types/moderacion';

export const MODO_SIMULADO = false;

type BackendPublication = {
  id: number;
  title?: string;
  location?: string | null;
  organization?: { id?: number; name?: string } | null;
  is_hidden?: boolean;
  created_at?: string;
};

export function extraerMensajeErrorModeracion(error: unknown, respaldo: string): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : respaldo;
  }

  const status = error.response?.status;
  const data = error.response?.data as
    | { message?: string; errors?: Record<string, string[]> }
    | undefined;

  if (status === 401) {
    return 'Tu sesión expiró o no estás autenticado. Inicia sesión nuevamente.';
  }

  if (status === 422 && data?.errors) {
    const primerError = Object.values(data.errors).flat()[0];
    if (primerError) return primerError;
  }

  if (data?.message) {
    return data.message;
  }

  if (status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }

  if (status === 404) {
    return 'El recurso solicitado no existe o no está disponible.';
  }

  return respaldo;
}

export async function listarUsuariosModeracion(busqueda?: string): Promise<UsuarioModeracion[]> {
  const q = busqueda?.trim();
  const { data } = await api.get<{ users?: UsuarioModeracion[]; data?: UsuarioModeracion[] }>(
    '/admin/users',
    { params: q ? { q } : undefined },
  );

  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

export async function listarPublicacionesModeracion(): Promise<PublicacionModeracion[]> {
  const { data } = await api.get<{
    publications?: PublicacionModeracion[];
    data?: PublicacionModeracion[];
  }>('/admin/publications');

  if (Array.isArray(data.publications)) return data.publications;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

export async function listarReportesModeracion(pagina = 1): Promise<ListaReportes> {
  const { data } = await api.get<{
    reports?: ReporteModeracion[];
    data?: ReporteModeracion[];
    meta?: MetaPaginacion;
  }>('/admin/publication-reports', {
    params: { page: pagina },
  });

  const reports = Array.isArray(data.reports)
    ? data.reports
    : Array.isArray(data.data)
      ? data.data
      : [];

  const meta: MetaPaginacion = data.meta ?? {
    current_page: pagina,
    per_page: 15,
    last_page: 1,
    total: reports.length,
  };

  return { reports, meta };
}

export async function cambiarEstadoUsuario(
  id: number,
  activo: boolean,
): Promise<UsuarioModeracion> {
  const { data } = await api.patch<{ message?: string; user: UsuarioModeracion }>(
    `/admin/users/${id}/status`,
    { is_active: activo },
  );
  return data.user;
}

export async function cambiarVisibilidadPublicacion(
  tipo: TipoPublicacionModeracion,
  id: number,
  oculta: boolean,
): Promise<PublicacionModeracion> {
  const ruta =
    tipo === 'proyecto'
      ? `/admin/projects/${id}/visibility`
      : `/admin/community-needs/${id}/visibility`;

  const { data } = await api.patch<{
    message?: string;
    project?: BackendPublication;
    community_need?: BackendPublication;
  }>(ruta, { is_hidden: oculta });

  const item = data.project ?? data.community_need;

  return {
    id: item?.id ?? id,
    type: tipo,
    title:
      item?.title ?? `${tipo === 'proyecto' ? 'Proyecto' : 'Necesidad comunitaria'} #${id}`,
    author_name: item?.organization?.name ?? item?.location ?? 'ProyectaTec',
    is_hidden: Boolean(item?.is_hidden ?? oculta),
    created_at: item?.created_at ?? new Date().toISOString(),
  };
}

/** status 'pending' reabre el reporte (el backend borra las notas). Con 'reviewed' o 'discarded' las notas son obligatorias. */
export async function resolverReporte(
  id: number,
  status: EstadoReporte,
  notas?: string,
): Promise<ReporteModeracion> {
  const body =
    status === 'pending'
      ? { status: 'pending' }
      : { status, decision_notes: (notas ?? '').trim() };

  const { data } = await api.patch<
    { report?: ReporteModeracion; data?: ReporteModeracion } & ReporteModeracion
  >(`/admin/publication-reports/${id}`, body);

  return data.report ?? data.data ?? data;
}