import { useLocation, useNavigate } from 'react-router-dom';
import PublicacionForm from '../components/publicaciones/PublicacionForm';
import { crearPublicacion } from '../api/publicacionesService';
import { useCategorias } from '../hooks/useCategorias';
import { RUTA_PUBLICACIONES } from '../types/publicacion';
import type {
  PublicacionFormValues,
  PublicacionMediaSelection,
  PublicacionPayload,
} from '../types/publicacion';

type NecesidadOrigen = {
  id: number;
  titulo: string;
  categoriaId: number | null;
  ubicacion: string;
  descripcion: string;
  organizacion: string;
};

export default function NuevaPublicacion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { categorias, cargando, error } = useCategorias();

  const desdeNecesidad = (location.state as { desdeNecesidad?: NecesidadOrigen } | null)
    ?.desdeNecesidad;

  const valoresIniciales: Partial<PublicacionFormValues> | undefined = desdeNecesidad
    ? {
        tipo: 'proyecto',
        title: `Proyecto: ${desdeNecesidad.titulo}`.slice(0, 255),
        category_id: desdeNecesidad.categoriaId ? String(desdeNecesidad.categoriaId) : '',
        location: desdeNecesidad.ubicacion || '',
        description: [
          `Proyecto creado para atender la necesidad comunitaria #${desdeNecesidad.id}: "${desdeNecesidad.titulo}" (publicada por ${desdeNecesidad.organizacion}).`,
          '',
          desdeNecesidad.descripcion,
        ]
          .join('\n')
          .slice(0, 2000),
      }
    : undefined;

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
      valoresIniciales={valoresIniciales}
      onSubmit={guardar}
      onCancel={() => navigate(RUTA_PUBLICACIONES)}
    />
  );
}
