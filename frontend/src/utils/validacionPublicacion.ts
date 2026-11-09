import { LIMITES, MODALIDADES } from '../types/publicacion';
import type {
  Modalidad,
  PublicacionErrors,
  PublicacionFormValues,
  PublicacionPayload,
} from '../types/publicacion';

export function validarPublicacion(v: PublicacionFormValues): PublicacionErrors {
  const e: PublicacionErrors = {};
  const titulo = v.title.trim();
  const descripcion = v.description.trim();
  const ubicacion = v.location.trim();

  if (!titulo) {
    e.title = 'Ingresa el título de la publicación.';
  } else if (titulo.length < LIMITES.titulo.min) {
    e.title = `El título debe tener al menos ${LIMITES.titulo.min} caracteres.`;
  } else if (titulo.length > LIMITES.titulo.max) {
    e.title = `El título no puede superar los ${LIMITES.titulo.max} caracteres.`;
  }

  if (!v.category_id) {
    e.category_id = 'Selecciona un sector.';
  }

  if (!descripcion) {
    e.description = 'Describe tu publicación.';
  } else if (descripcion.length < LIMITES.descripcion.min) {
    e.description = `La descripción debe tener al menos ${LIMITES.descripcion.min} caracteres.`;
  } else if (descripcion.length > LIMITES.descripcion.max) {
    e.description = `La descripción no puede superar los ${LIMITES.descripcion.max} caracteres.`;
  }

  if (ubicacion.length > LIMITES.ubicacion.max) {
    e.location = 'La ubicación es demasiado larga.';
  }

  if (v.tipo === 'proyecto') {
    if (v.modality && !MODALIDADES.some((m) => m.value === v.modality)) {
      e.modality = 'Selecciona una modalidad válida.';
    }
    
    if (v.starts_at && v.ends_at && v.ends_at < v.starts_at) {
      e.ends_at = 'La fecha de fin no puede ser anterior a la de inicio.';
    }
  }

  return e;
}

export function construirPayload(v: PublicacionFormValues): PublicacionPayload {
  const base = {
    title: v.title.trim(),
    description: v.description.trim(),
    category_id: Number(v.category_id),
    location: v.location.trim() || null,
  };

  if (v.tipo === 'proyecto') {
    return {
      type: 'project',
      ...base,
      modality: (v.modality || null) as Modalidad | null,
      starts_at: v.starts_at || null,
      ends_at: v.ends_at || null,
    };
  }

  return { type: 'community_need', ...base };
}


export function fechaParaInput(valor?: string | null): string {
  return valor ? valor.slice(0, 10) : '';
}