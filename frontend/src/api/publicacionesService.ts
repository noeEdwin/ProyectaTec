import type {
  Categoria,
  PublicacionFormValues,
  PublicacionMediaItem,
  PublicacionMediaSelection,
  PublicacionPayload,
  RequerimientoItem,
  TipoPublicacion,
} from '../types/publicacion';
import api from './axios';

export type RequerimientoPublicacion = {
  id?: number;
  title: string;
  description?: string | null;
  required_profile?: string | null;
  openings: number;
  status?: string;
};

type PublicationRecord = {
  id: number;
  title: string;
  description: string;
  status: string;
  category_id: number;
  category?: { id: number; name: string };
  organization?: { id?: number; name: string } | null;
  location?: string | null;
  modality?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  cover_image_url?: string | null;
  gallery?: PublicacionMediaItem[];
  gallery_urls?: string[];
  needs?: RequerimientoPublicacion[];
  requirements?: RequerimientoPublicacion[];
  is_hidden?: boolean;
  created_at?: string;
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

export type FiltrosPublicaciones = {
  q?: string;
  category_id?: number;
  sector?: string;
  page?: number;
};

export type MetaPaginacionPublicaciones = {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
};

export type ResultadoBusquedaPublicaciones = {
  items: PublicacionListado[];
  meta: MetaPaginacionPublicaciones;
};

type ProjectsListResponse = {
  projects?: PublicationRecord[];
  data?: PublicationRecord[];
  meta?: MetaPaginacionPublicaciones;
};

type CommunityNeedsListResponse = {
  community_needs?: PublicationRecord[];
  data?: PublicationRecord[];
  meta?: MetaPaginacionPublicaciones;
};

const cacheBusquedas = new Map<
  string,
  { expira: number; data: ResultadoBusquedaPublicaciones }
>();
const CACHE_TTL_MS = 30_000;

/** Invalida resultados en caché cuando cambia la visibilidad de una publicación. */
export function limpiarCacheBusquedas(): void {
  cacheBusquedas.clear();
}

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

/** Consulta proyectos y necesidades públicas aplicando filtros de servidor y paginación. */
export async function buscarPublicaciones(
  filtros: FiltrosPublicaciones = {},
): Promise<ResultadoBusquedaPublicaciones> {
  const q = filtros.q?.trim();
  const sector = filtros.sector?.trim();
  const categoryId =
    typeof filtros.category_id === 'number' && filtros.category_id > 0
      ? filtros.category_id
      : undefined;
  const page = typeof filtros.page === 'number' && filtros.page >= 1 ? filtros.page : 1;

  const cacheKey = JSON.stringify({
    q: q ?? '',
    categoryId: categoryId ?? 0,
    sector: sector ?? '',
    page,
  });
  const enCache = cacheBusquedas.get(cacheKey);
  if (enCache && enCache.expira > Date.now()) {
    return enCache.data;
  }

  const paramsBase: Record<string, string | number> = { page };
  if (q) paramsBase.q = q;
  if (categoryId) paramsBase.category_id = categoryId;

  const paramsProyectos: Record<string, string | number> = { ...paramsBase };
  if (sector) paramsProyectos.sector = sector;

  // El filtro "sector" solo aplica a proyectos de organizaciones aprobadas.
  const [projectsResponse, needsResponse] = await Promise.all([
    api.get<ProjectsListResponse>('/projects', { params: paramsProyectos }),
    sector
      ? Promise.resolve<{ data: CommunityNeedsListResponse }>({
          data: {
            community_needs: [],
            meta: { current_page: page, per_page: 15, last_page: 1, total: 0 },
          },
        })
      : api.get<CommunityNeedsListResponse>('/community-needs', { params: paramsBase }),
  ]);

  const projects: PublicationRecord[] = Array.isArray(projectsResponse.data.projects)
    ? projectsResponse.data.projects
    : (projectsResponse.data.data ?? []);

  const needs: PublicationRecord[] = Array.isArray(needsResponse.data.community_needs)
    ? needsResponse.data.community_needs
    : (needsResponse.data.data ?? []);

  const metaProjects = projectsResponse.data.meta ?? {
    current_page: page,
    per_page: 15,
    last_page: 1,
    total: projects.length,
  };

  const metaNeeds = needsResponse.data.meta ?? {
    current_page: page,
    per_page: 15,
    last_page: 1,
    total: needs.length,
  };

  const resultado: ResultadoBusquedaPublicaciones = {
    items: [
      ...projects.map((item) => ({ ...item, type: 'proyecto' as const })),
      ...needs.map((item) => ({ ...item, type: 'necesidad' as const })),
    ],
    meta: {
      current_page: page,
      per_page: metaProjects.per_page + (sector ? 0 : metaNeeds.per_page),
      last_page: Math.max(metaProjects.last_page, sector ? 1 : metaNeeds.last_page),
      total: metaProjects.total + (sector ? 0 : metaNeeds.total),
    },
  };

  cacheBusquedas.set(cacheKey, {
    expira: Date.now() + CACHE_TTL_MS,
    data: resultado,
  });

  return resultado;
}

/** Lista proyectos y necesidades públicas para mostrarlas en el catálogo o inicio. */
export async function listarPublicaciones(
  filtros: FiltrosPublicaciones = {},
): Promise<PublicacionListado[]> {
  const resultado = await buscarPublicaciones(filtros);
  return resultado.items;
}

async function subirMediaPublicacion(
  tipo: TipoPublicacion | string,
  id: number,
  media: PublicacionMediaSelection,
): Promise<void> {
  const formData = new FormData();
  if (media.coverFile) {
    formData.append('cover_image', media.coverFile);
  }
  if (media.removeCover) {
    formData.append('remove_cover', '1');
  }
  if (media.keepGallery) {
    formData.append('sync_gallery', '1');
    media.keepGallery.forEach((path) => {
      formData.append('keep_gallery[]', path);
    });
  }
  if (media.galleryFiles) {
    media.galleryFiles.forEach((file) => {
      formData.append('gallery[]', file);
    });
  }

  const normalizedType = esTipoProyecto(tipo) ? 'proyecto' : 'necesidad';
  await api.post(`/publications/${normalizedType}/${id}/media`, formData);
}

export async function crearPublicacion(
  payload: PublicacionPayload,
  media?: PublicacionMediaSelection,
): Promise<{ id: number }> {
  cacheBusquedas.clear();

  let createdId: number;
  const tipo: TipoPublicacion = payload.type === 'project' ? 'proyecto' : 'necesidad';

  if (payload.type === 'project') {
    const { data } = await api.post<{ project: { id: number } }>('/projects', {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      modality: payload.modality,
      location: payload.location,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      needs: payload.needs,
      status: 'open',
    });
    createdId = data.project.id;
  } else {
    const { data } = await api.post<{ community_need: { id: number } }>('/community-needs', {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      location: payload.location,
      requirements: payload.requirements,
      status: 'open',
    });
    createdId = data.community_need.id;
  }

  if (media && (media.coverFile || (media.galleryFiles && media.galleryFiles.length > 0))) {
    await subirMediaPublicacion(tipo, createdId, media);
  }

  return { id: createdId };
}

/** Actualiza usando PATCH, método declarado por las rutas Laravel. */
export async function actualizarPublicacion(
  tipo: TipoPublicacion | string,
  id: number,
  payload: PublicacionPayload,
  media?: PublicacionMediaSelection,
): Promise<void> {
  cacheBusquedas.clear();

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
      needs: payload.needs,
    });
  } else {
    await api.patch(path, {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      location: payload.location,
      requirements: payload.requirements,
    });
  }

  if (media) {
    await subirMediaPublicacion(tipo, id, media);
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
  const rawReqs = normalizedType === 'proyecto'
    ? (publication.needs ?? [])
    : (publication.requirements ?? []);

  const requirements: RequerimientoItem[] = rawReqs.map((item) => ({
    ...(item.id ? { id: item.id } : {}),
    title: item.title ?? '',
    description: item.description ?? '',
    required_profile: item.required_profile ?? '',
    openings: Number(item.openings) || 1,
  }));

  return {
    tipo: normalizedType,
    title: publication.title ?? '',
    category_id: String(publication.category_id ?? publication.category?.id ?? ''),
    modality: publication.modality ?? '',
    location: publication.location ?? '',
    starts_at: publication.starts_at?.slice(0, 10) ?? '',
    ends_at: publication.ends_at?.slice(0, 10) ?? '',
    description: publication.description ?? '',
    requirements,
    existingCoverUrl: publication.cover_image_url ?? null,
    existingGallery: publication.gallery ?? [],
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