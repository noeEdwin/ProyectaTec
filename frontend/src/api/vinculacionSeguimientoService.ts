import axios from 'axios';
import api from './axios';
import type {
  DatosSolicitudVinculacion,
  EstadoSolicitud,
  SolicitudEnviada,
  SolicitudRecibida,
} from '../types/vinculacion';
import type {
  AvanceProyecto,
  MetaAvancesProyecto,
  NuevoAvanceProyecto,
  UltimoProgresoProyecto,
} from '../types/seguimientoProyecto';

export type DecisionSolicitud = Extract<EstadoSolicitud, 'accepted' | 'rejected'>;

export type ListaAvancesRespuesta = {
  avances: AvanceProyecto[];
  ultimoProgreso: UltimoProgresoProyecto | null;
  meta: MetaAvancesProyecto;
};

export function extraerMensajeErrorVinculacion(error: unknown, respaldo: string): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : respaldo;
  }

  const status = error.response?.status;
  const data = error.response?.data as
    | { message?: string; errors?: Record<string, string[]> }
    | undefined;

  if (status === 401) {
    return 'Tu sesión expiró o no has iniciado sesión. Inicia sesión nuevamente.';
  }

  if (status === 422 && data?.errors) {
    const primerError = Object.values(data.errors).flat()[0];
    if (primerError) return primerError;
  }

  if (data?.message) {
    return data.message;
  }

  if (status === 403) {
    return 'No tienes permisos para realizar esta acción en este proyecto.';
  }

  if (status === 404) {
    return 'El recurso solicitado no existe o ya no está disponible.';
  }

  return respaldo;
}

export async function enviarSolicitudVinculacion(
  projectId: number,
  datos: DatosSolicitudVinculacion,
): Promise<SolicitudEnviada> {
  const formData = new FormData();
  formData.append('message', datos.message.trim());

  if (datos.project_need_id !== null) {
    formData.append('project_need_id', String(datos.project_need_id));
  }
  if (datos.tipo_apoyo.trim()) {
    formData.append('tipo_apoyo', datos.tipo_apoyo.trim());
  }
  if (datos.disponibilidad.trim()) {
    formData.append('disponibilidad', datos.disponibilidad.trim());
  }
  if (datos.expectativas.trim()) {
    formData.append('expectativas', datos.expectativas.trim());
  }
  if (datos.portafolio_url.trim()) {
    formData.append('portafolio_url', datos.portafolio_url.trim());
  }
  if (datos.github_url.trim()) {
    formData.append('github_url', datos.github_url.trim());
  }
  if (datos.linkedin_url.trim()) {
    formData.append('linkedin_url', datos.linkedin_url.trim());
  }
  if (datos.cv_pdf) {
    formData.append('cv_pdf', datos.cv_pdf);
  }

  const { data } = await api.post<{ application: SolicitudEnviada }>(
    `/projects/${projectId}/applications`,
    formData,
  );

  return data.application;
}

export async function listarMisSolicitudesEnviadas(
  status?: EstadoSolicitud,
): Promise<SolicitudEnviada[]> {
  const { data } = await api.get<{ applications?: SolicitudEnviada[] }>('/me/applications', {
    params: status ? { status } : undefined,
  });

  return Array.isArray(data.applications) ? data.applications : [];
}

export async function listarSolicitudesProyecto(
  projectId: number,
  status?: EstadoSolicitud,
): Promise<SolicitudRecibida[]> {
  const { data } = await api.get<{ applications?: SolicitudRecibida[] }>(
    `/projects/${projectId}/applications`,
    { params: status ? { status } : undefined },
  );

  return Array.isArray(data.applications) ? data.applications : [];
}

export async function resolverSolicitudVinculacion(
  applicationId: number,
  status: DecisionSolicitud,
  reviewNotes?: string,
  role?: string,
): Promise<SolicitudRecibida> {
  const body: { status: DecisionSolicitud; review_notes?: string; role?: string } = {
    status,
  };

  if (reviewNotes && reviewNotes.trim()) {
    body.review_notes = reviewNotes.trim();
  }

  if (role && role.trim()) {
    body.role = role.trim();
  }

  const { data } = await api.patch<{ application: SolicitudRecibida }>(
    `/applications/${applicationId}`,
    body,
  );

  return data.application;
}

export async function listarAvancesProyecto(
  projectId: number,
  pagina = 1,
): Promise<ListaAvancesRespuesta> {
  const { data } = await api.get<{
    project_updates?: AvanceProyecto[];
    latest_progress?: UltimoProgresoProyecto | null;
    meta?: MetaAvancesProyecto;
  }>(`/projects/${projectId}/updates`, {
    params: { page: pagina },
  });

  const avances = Array.isArray(data.project_updates) ? data.project_updates : [];

  return {
    avances,
    ultimoProgreso: data.latest_progress ?? null,
    meta: data.meta ?? {
      current_page: pagina,
      per_page: 15,
      last_page: 1,
      total: avances.length,
    },
  };
}

export type ParticipanteProyecto = {
  id: number;
  role: string;
  joined_at: string | null;
  user: {
    id: number;
    name: string;
  };
};

export async function listarParticipantesProyecto(
  projectId: number,
): Promise<ParticipanteProyecto[]> {
  const { data } = await api.get<{ members?: ParticipanteProyecto[] }>(
    `/projects/${projectId}/members`,
  );

  return Array.isArray(data.members) ? data.members : [];
}

export async function registrarAvanceProyecto(
  projectId: number,
  datos: NuevoAvanceProyecto,
): Promise<AvanceProyecto> {
  const payload: { title: string; description: string; progress?: number | null } = {
    title: datos.title.trim(),
    description: datos.description.trim(),
  };

  if (datos.progress !== null) {
    payload.progress = datos.progress;
  }

  const { data } = await api.post<{ project_update: AvanceProyecto }>(
    `/projects/${projectId}/updates`,
    payload,
  );

  return data.project_update;
}