import type {
  Categoria,
  PublicacionFormValues,
  PublicacionPayload,
  TipoPublicacion,
} from '../types/publicacion';
import api from './axios';

type PublicationRecord = {
  id: number;
  title: string;
  description: string;
  status: string;
  category_id: number;
  category?: { id: number; name: string };
  organization?: { name: string } | null;
  location?: string | null;
  modality?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type MiPublicacion = {
  id: number;
  type: TipoPublicacion;
  title: string;
  description: string;
  status: string;
  category_id: number;
  updated_at: string | null;
  can_edit: boolean;
};

export type PublicacionListado = PublicationRecord & {
  type: TipoPublicacion;
};

function esTipoProyecto(tipo?: string): boolean {
  return tipo === 'proyecto' || tipo === 'project';
}

function extraerPublicacion(data: Record<string, unknown>, tipo: string): PublicationRecord {
  const key = esTipoProyecto(tipo) ? 'project' : 'community_need';
  const item = data[key] ?? data.data ?? data;
  return item as PublicationRecord;
}

/** Obtiene categorías desde Laravel, aceptando el contrato enveloped o una lista directa. */
export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<Categoria[] | { categories?: Categoria[]; data?: Categoria[] }>('/categories');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.categories)) return data.categories;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

export async function listarMisPublicaciones(): Promise<MiPublicacion[]> {
  const { data } = await api.get<{ publications: MiPublicacion[] }>('/me/publications');
  return data.publications;
}

/** Lista proyectos y necesidades públicas para mostrarlas en el catálogo. */
export async function listarPublicaciones(): Promise<PublicacionListado[]> {
  const [projectsResponse, needsResponse] = await Promise.all([
    api.get<{ projects?: PublicationRecord[]; data?: PublicationRecord[] }>('/projects'),
    api.get<{ community_needs?: PublicationRecord[]; data?: PublicationRecord[] }>('/community-needs'),
  ]);

  const projects = Array.isArray(projectsResponse.data.projects)
    ? projectsResponse.data.projects
    : projectsResponse.data.data ?? [];
  const needs = Array.isArray(needsResponse.data.community_needs)
    ? needsResponse.data.community_needs
    : needsResponse.data.data ?? [];

  return [
    ...projects.map((item) => ({ ...item, type: 'proyecto' as const })),
    ...needs.map((item) => ({ ...item, type: 'necesidad' as const })),
  ];
}

export async function crearPublicacion(payload: PublicacionPayload): Promise<{ id: number }> {
  if (payload.type === 'project') {
    const { data } = await api.post<{ project: { id: number } }>('/projects', {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      modality: payload.modality,
      location: payload.location,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      status: 'open',
    });
    return { id: data.project.id };
  }

  const { data } = await api.post<{ community_need: { id: number } }>('/community-needs', {
    title: payload.title,
    description: payload.description,
    category_id: payload.category_id,
    location: payload.location,
    status: 'open',
  });
  return { id: data.community_need.id };
}

/** Actualiza usando PATCH, método declarado por las rutas Laravel. */
export async function actualizarPublicacion(
  tipo: TipoPublicacion | string,
  id: number,
  payload: PublicacionPayload,
): Promise<void> {
  const path = esTipoProyecto(tipo) ? `/projects/${id}` : `/community-needs/${id}`;
  if (payload.type === 'project') {
    await api.patch(path, {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      modality: payload.modality,
      location: payload.location,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
    });
  } else {
    await api.patch(path, {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      location: payload.location,
    });
  }
}

/** Obtiene detalles de una publicación visible públicamente. */
export async function obtenerDetallePublicacion(tipo: string, id: number): Promise<PublicationRecord> {
  const path = esTipoProyecto(tipo) ? `/projects/${id}` : `/community-needs/${id}`;
  const { data } = await api.get<Record<string, unknown>>(path);
  return extraerPublicacion(data, tipo);
}

/** Obtiene una publicación administrable por la cuenta, incluso si es borrador. */
export async function obtenerPublicacion(
  tipo: TipoPublicacion | string,
  id: number,
): Promise<Partial<PublicacionFormValues>> {
  const normalizedType = esTipoProyecto(tipo) ? 'proyecto' : 'necesidad';
  const { data } = await api.get<Record<string, unknown>>(`/me/publications/${normalizedType}/${id}`);
  const publication = extraerPublicacion(data, normalizedType);

  return {
    tipo: normalizedType,
    title: publication.title ?? '',
    category_id: String(publication.category_id ?? publication.category?.id ?? ''),
    modality: publication.modality ?? '',
    location: publication.location ?? '',
    starts_at: publication.starts_at?.slice(0, 10) ?? '',
    ends_at: publication.ends_at?.slice(0, 10) ?? '',
    description: publication.description ?? '',
  };
}

/** Reporta una publicación con el contrato aceptado por Laravel. */
export async function reportarPublicacion(payload: {
  tipo: TipoPublicacion | string;
  id: number;
  reason: 'inappropriate' | 'spam' | 'misinformation' | 'other';
  details?: string;
}): Promise<void> {
  const isProject = esTipoProyecto(payload.tipo);
  await api.post('/publication-reports', {
    ...(isProject ? { project_id: payload.id } : { community_need_id: payload.id }),
    reason: payload.reason,
    details: payload.details,
  });
}
