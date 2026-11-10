import axios from 'axios';
import type {
  Categoria,
  PublicacionFormValues,
  PublicacionPayload,
  TipoPublicacion,
} from '../types/publicacion';

// Permitir el envío de cookies de sesión para Laravel Sanctum
axios.defaults.withCredentials = true;

/** Obtiene la cabecera de autorización si existe un token guardado */
function obtenerHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Auxiliar para saber si el tipo es proyecto (soporta 'proyecto' y 'project') */
function esTipoProyecto(tipo?: string): boolean {
  return tipo === 'proyecto' || tipo === 'project';
}

/** GET de categorías (tabla categories). */
export async function listarCategorias(): Promise<Categoria[]> {
  try {
    const response = await axios.get('/api/categories', { headers: obtenerHeaders() });
    const data = response.data;

    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return [];
  }
}

/** POST para crear publicaciones reales en PostgreSQL. */
export async function crearPublicacion(
  payload: PublicacionPayload,
): Promise<{ id: number }> {
  const endpoint = esTipoProyecto(payload.type) ? '/api/projects' : '/api/community-needs';
  const { type, ...dataToSend } = payload;

  const body = {
    ...dataToSend,
    status: 'open',
  };

  const { data } = await axios.post(endpoint, body, { headers: obtenerHeaders() });
  const item = data.project || data.community_need || data.data || data;
  return { id: item.id };
}

/** PUT para actualizar proyectos o necesidades comunitarias existentes. */
export async function actualizarPublicacion(
  tipo: TipoPublicacion | string,
  id: number,
  payload: PublicacionPayload,
): Promise<void> {
  const endpoint = esTipoProyecto(tipo) ? `/api/projects/${id}` : `/api/community-needs/${id}`;
  const { type, ...dataToSend } = payload;

  const body = {
    ...dataToSend,
    status: 'open',
  };

  await axios.put(endpoint, body, { headers: obtenerHeaders() });
}

/** GET para obtener el detalle de una publicación por tipo e ID. */
export async function obtenerPublicacion(
  tipo: TipoPublicacion | string,
  id: number,
): Promise<Partial<PublicacionFormValues>> {
  const esProyecto = esTipoProyecto(tipo);
  const endpoint = esProyecto ? `/api/projects/${id}` : `/api/community-needs/${id}`;
  const { data } = await axios.get(endpoint, { headers: obtenerHeaders() });

  // Extraer según la clave que devuelve el controlador de Laravel
  const item = data.project || data.community_need || data.data || data;

  if (esProyecto) {
    return {
      tipo: 'proyecto',
      title: item.title || '',
      category_id: String(item.category_id || item.category?.id || ''),
      modality: item.modality || '',
      location: item.location || '',
      starts_at: item.starts_at ? item.starts_at.slice(0, 10) : '',
      ends_at: item.ends_at ? item.ends_at.slice(0, 10) : '',
      description: item.description || '',
    };
  }

  return {
    tipo: 'necesidad',
    title: item.title || '',
    category_id: String(item.category_id || item.category?.id || ''),
    location: item.location || '',
    description: item.description || '',
  };
}

/** POST para enviar reportes sobre publicaciones inapropiadas. */
export async function reportarPublicacion(payload: {
  reportable_type: string;
  reportable_id: number;
  reason: string;
  details?: string;
}): Promise<void> {
  await axios.post('/api/publication-reports', payload, { headers: obtenerHeaders() });
}