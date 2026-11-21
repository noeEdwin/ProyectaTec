import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

import { obtenerDetallePublicacion } from '../api/publicacionesService';
import SeguimientoProyecto from '../components/seguimiento/SeguimientoProyecto';

import '../styles/seguimientoProyecto.css';

export default function SeguimientoProyectoPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [tituloProyecto, setTituloProyecto] =
    useState<string | null>(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const idProyecto = Number(projectId);

  const idValido =
    Number.isSafeInteger(idProyecto) && idProyecto > 0;

  useEffect(() => {
    let activo = true;

    if (!idValido) {
      return;
    }

    async function cargarProyecto() {
      setCargando(true);
      setError(null);
      setTituloProyecto(null);

      try {
        const proyecto = await obtenerDetallePublicacion(
          'project',
          idProyecto,
        );

        if (!activo) return;

        setTituloProyecto(proyecto.title);
      } catch (err) {
        if (!activo) return;

        if (
          axios.isAxiosError(err) &&
          err.response?.status === 404
        ) {
          setError('No se encontró el proyecto solicitado.');
        } else {
          setError(
            'No se pudo cargar la información del proyecto.',
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarProyecto();

    return () => {
      activo = false;
    };
  }, [idProyecto, idValido]);

  if (!idValido || cargando || error || !tituloProyecto) {
    return (
      <main className="sp-pagina">
        <div className="sp-contenedor">
          <section className="sp-tarjeta">
            {cargando && idValido ? (
              <p role="status">
                Cargando información del proyecto…
              </p>
            ) : (
              <>
                <h1>Seguimiento no disponible</h1>
                <p role="alert">
                  {!idValido
                    ? 'El identificador del proyecto no es válido.'
                    : error ||
                      'No hay información disponible para este proyecto.'}
                </p>
                <Link className="ic-enlace" to="/iniciativas">
                  Volver al catálogo →
                </Link>
              </>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <SeguimientoProyecto
      proyecto={{
        id: idProyecto,
        titulo: tituloProyecto,
      }}
    />
  );
}
