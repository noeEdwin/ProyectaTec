import type {
  Categoria,
  PublicacionFormValues,
  PublicacionPayload,
  TipoPublicacion,
} from '../types/publicacion';
import api from './axios';

/** GET de categorías (tabla categories). */
export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<{ categories: Categoria[] }>('/categories');
  return data.categories;
}


export async function crearPublicacion(
  payload: PublicacionPayload,
): Promise<{ id: number }> {
  if (payload.type === 'project') {
    const response = await api.post<{ project: { id: number } }>('/projects', {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      modality: payload.modality,
      location: payload.location,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      status: 'open',
    });
    return { id: response.data.project.id };
  }

  const response = await api.post<{ community_need: { id: number } }>('/community-needs', {
    title: payload.title,
    description: payload.description,
    category_id: payload.category_id,
    location: payload.location,
    status: 'open',
  });
  return { id: response.data.community_need.id };
}

/** PUT/PATCH de la publicación existente (mismo payload que al crear). */
export async function actualizarPublicacion(
  tipo: TipoPublicacion,
  id: number,
  payload: PublicacionPayload,
): Promise<void> {
  const path = tipo === 'proyecto' ? `/projects/${id}` : `/community-needs/${id}`;
  const data = payload.type === 'project'
    ? {
        title: payload.title,
        description: payload.description,
        category_id: payload.category_id,
        modality: payload.modality,
        location: payload.location,
        starts_at: payload.starts_at,
        ends_at: payload.ends_at,
      }
    : {
        title: payload.title,
        description: payload.description,
        category_id: payload.category_id,
        location: payload.location,
      };
  await api.patch(path, data);
}


export async function obtenerPublicacion(
  tipo: TipoPublicacion,
  id: number,
): Promise<Partial<PublicacionFormValues>> {
  const path = tipo === 'proyecto' ? `/projects/${id}` : `/community-needs/${id}`;
  const key = tipo === 'proyecto' ? 'project' : 'community_need';
  const { data } = await api.get<Record<string, PublicacionFormValues & {
    category_id: number;
    starts_at?: string | null;
    ends_at?: string | null;
    modality?: string | null;
  }>>(path);
  const publication = data[key];

  return {
    tipo,
    title: publication.title,
    category_id: String(publication.category_id),
    modality: publication.modality ?? '',
    location: publication.location ?? '',
    starts_at: publication.starts_at?.slice(0, 10) ?? '',
    ends_at: publication.ends_at?.slice(0, 10) ?? '',
    description: publication.description,
  };
}
