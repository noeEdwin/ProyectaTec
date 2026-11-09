import { useEffect, useState } from 'react';
import { listarCategorias } from '../api/publicacionesService';
import type { Categoria } from '../types/publicacion';

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    listarCategorias()
      .then((data) => {
        if (activo) setCategorias(data);
      })
      .catch(() => {
        if (activo) setError('No se pudieron cargar los sectores. Recarga la página.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { categorias, cargando, error };
}