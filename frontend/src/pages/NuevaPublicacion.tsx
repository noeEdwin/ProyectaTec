import { useNavigate } from 'react-router-dom';
import PublicacionForm from '../components/publicaciones/PublicacionForm';
import { crearPublicacion } from '../api/publicacionesService';
import { useCategorias } from '../hooks/useCategorias';
import { RUTA_PUBLICACIONES } from '../types/publicacion';
import type { PublicacionMediaSelection, PublicacionPayload } from '../types/publicacion';

export default function NuevaPublicacion() {
  const navigate = useNavigate();
  const { categorias, cargando, error } = useCategorias();

  async function guardar(payload: PublicacionPayload, media?: PublicacionMediaSelection) {
    await crearPublicacion(payload, media);
    navigate(RUTA_PUBLICACIONES);
  }

  return (
    <PublicacionForm
      modo="crear"
      categorias={categorias}
      cargandoCategorias={cargando}
      errorCategorias={error}
      onSubmit={guardar}
      onCancel={() => navigate(RUTA_PUBLICACIONES)}
    />
  );
}
