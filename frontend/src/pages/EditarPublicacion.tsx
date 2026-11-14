import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PublicacionForm from '../components/publicaciones/PublicacionForm';
import {
  actualizarPublicacion,
  obtenerPublicacion,
} from '../api/publicacionesService';
import { useCategorias } from '../hooks/useCategorias';
import { RUTA_PUBLICACIONES } from '../types/publicacion';
import type {
  PublicacionFormValues,
  PublicacionPayload,
  TipoPublicacion,
} from '../types/publicacion';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; valores: Partial<PublicacionFormValues> };

function normalizarTipo(valor?: string): TipoPublicacion | null {
  if (valor === 'proyecto' || valor === 'project') return 'proyecto';
  if (valor === 'necesidad' || valor === 'community_need') return 'necesidad';
  return null;
}

export default function EditarPublicacion() {
  const navigate = useNavigate();
  const { tipo: tipoParam, id } = useParams<{ tipo: string; id: string }>();
  const { categorias, cargando, error } = useCategorias();

  const tipo = normalizarTipo(tipoParam);
  const idNumero = Number(id);
  const parametrosValidos = tipo !== null && Number.isInteger(idNumero) && idNumero > 0;

  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    if (!parametrosValidos || !tipo) return;

    let activo = true;
    obtenerPublicacion(tipo, idNumero)
      .then((valores) => {
        if (activo) setEstado({ fase: 'listo', valores: { ...valores, tipo } });
      })
      .catch((err: unknown) => {
        if (!activo) return;
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            navigate('/acceso');
            return;
          }
          if (err.response?.status === 404) {
            setEstado({ fase: 'error', mensaje: 'La publicación que buscas no existe.' });
            return;
          }
        }
        setEstado({
          fase: 'error',
          mensaje: 'No se pudo cargar la publicación. Inténtalo nuevamente.',
        });
      });

    return () => {
      activo = false;
    };
  }, [parametrosValidos, tipo, idNumero, navigate]);

  if (!parametrosValidos || !tipo) {
    return <Mensaje texto="La dirección de la publicación no es válida." alerta />;
  }
  if (estado.fase === 'cargando') {
    return <Mensaje texto="Cargando datos de la publicación..." />;
  }
  if (estado.fase === 'error') {
    return <Mensaje texto={estado.mensaje} alerta />;
  }

  async function guardar(payload: PublicacionPayload) {
    try {
      await actualizarPublicacion(tipo as TipoPublicacion, idNumero, payload);
      navigate(RUTA_PUBLICACIONES);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate('/acceso');
        return;
      }
      // Se relanza el error para que PublicacionForm muestre una sola alerta (403, 422 o red)
      throw err;
    }
  }

  return (
    <PublicacionForm
      modo="editar"
      categorias={categorias}
      cargandoCategorias={cargando}
      errorCategorias={error}
      valoresIniciales={estado.valores}
      onSubmit={guardar}
      onCancel={() => navigate(RUTA_PUBLICACIONES)}
    />
  );
}

function Mensaje({ texto, alerta = false }: { texto: string; alerta?: boolean }) {
  return (
    <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#64748b', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <p role={alerta ? 'alert' : 'status'}>{texto}</p>
    </div>
  );
}