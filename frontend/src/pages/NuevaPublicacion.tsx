import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PublicacionForm from '../components/publicaciones/PublicacionForm';
import { crearPublicacion } from '../api/publicacionesService';
import { useCategorias } from '../hooks/useCategorias';
import { RUTA_PUBLICACIONES } from '../types/publicacion';
import type { PublicacionPayload } from '../types/publicacion';

export default function NuevaPublicacion() {
  const navigate = useNavigate();
  const { categorias, cargando, error } = useCategorias();
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  async function guardar(payload: PublicacionPayload) {
    setErrorEnvio(null);
    try {
      await crearPublicacion(payload);
      navigate(RUTA_PUBLICACIONES);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          setErrorEnvio('Tu sesión ha expirado o no estás autenticado. Por favor vuelve a iniciar sesión.');
        } else if (status === 403) {
          setErrorEnvio('No tienes permisos para crear esta publicación.');
        }
      }
      // Relanza el error para que PublicacionForm muestre las alertas por campo
      throw err;
    }
  }

  return (
    <>
      {errorEnvio && (
        <div style={{ maxWidth: '800px', margin: '1rem auto 0', padding: '0.875rem 1.25rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px', fontSize: '14px' }} role="alert">
          {errorEnvio}
        </div>
      )}
      <PublicacionForm
        modo="crear"
        categorias={categorias}
        cargandoCategorias={cargando}
        errorCategorias={error}
        onSubmit={guardar}
        onCancel={() => navigate(RUTA_PUBLICACIONES)}
      />
    </>
  );
}