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

function esTipo(valor?: string): valor is TipoPublicacion {
  return valor === 'proyecto' || valor === 'necesidad';
}

export default function EditarPublicacion() {
  const navigate = useNavigate();
  const { tipo, id } = useParams<{ tipo: string; id: string }>();
  const { categorias, cargando, error } = useCategorias();

  const idNumero = Number(id);
  const parametrosValidos = esTipo(tipo) && Number.isInteger(idNumero) && idNumero > 0;

  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    if (!parametrosValidos || !esTipo(tipo)) return;

    let activo = true;
    setEstado({ fase: 'cargando' });

    obtenerPublicacion(tipo, idNumero)
      .then((valores) => {
        if (activo) setEstado({ fase: 'listo', valores: { ...valores, tipo } });
      })
      .catch((err: unknown) => {
        if (!activo) return;
        const noExiste = axios.isAxiosError(err) && err.response?.status === 404;
        setEstado({
          fase: 'error',
          mensaje: noExiste
            ? 'La publicación que buscas no existe.'
            : 'No se pudo cargar la publicación. Inténtalo nuevamente.',
        });
      });

    return () => {
      activo = false;
    };
  }, [parametrosValidos, tipo, idNumero]);

  if (!parametrosValidos || !esTipo(tipo)) {
    return <Mensaje texto="La dirección de la publicación no es válida." />;
  }
  if (estado.fase === 'cargando') {
    return <Mensaje texto="Cargando publicación..." />;
  }
  if (estado.fase === 'error') {
    return <Mensaje texto={estado.mensaje} alerta />;
  }

  async function guardar(payload: PublicacionPayload) {
    await actualizarPublicacion(tipo as TipoPublicacion, idNumero, payload);
    navigate(RUTA_PUBLICACIONES);
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
    <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
      <p role={alerta ? 'alert' : 'status'}>{texto}</p>
    </div>
  );
}