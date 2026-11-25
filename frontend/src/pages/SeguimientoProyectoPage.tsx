import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

import api from '../api/axios';
import { useAuth } from '../context/auth-context';
import {
  listarMisPublicaciones,
  obtenerDetallePublicacion,
} from '../api/publicacionesService';
import {
  actualizarPorcentajeAvance,
  extraerMensajeErrorVinculacion,
  listarAvancesProyecto,
  listarMisSolicitudesEnviadas,
  registrarAvanceProyecto,
} from '../api/vinculacionSeguimientoService';
import SeguimientoProyecto from '../components/seguimiento/SeguimientoProyecto';
import type {
  AvanceProyecto,
  NuevoAvanceProyecto,
  UltimoProgresoProyecto,
} from '../types/seguimientoProyecto';

import '../styles/seguimientoProyecto.css';

export default function SeguimientoProyectoPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  const [tituloProyecto, setTituloProyecto] =
    useState<string | null>(null);
  const [estadoProyecto, setEstadoProyecto] =
    useState<string>('open');
  const [puedeRegistrar, setPuedeRegistrar] = useState(false);
  const [esDueno, setEsDueno] = useState(false);

  const [avances, setAvances] = useState<AvanceProyecto[]>([]);
  const [ultimoProgreso, setUltimoProgreso] =
    useState<UltimoProgresoProyecto | null>(null);
  const [cargandoAvances, setCargandoAvances] = useState(true);
  const [errorAvances, setErrorAvances] = useState<string | null>(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const idProyecto = Number(projectId);

  const idValido =
    Number.isSafeInteger(idProyecto) && idProyecto > 0;

  const cargarAvances = useCallback(async () => {
    if (!idValido) return;
    setCargandoAvances(true);
    setErrorAvances(null);
    try {
      const res = await listarAvancesProyecto(idProyecto);
      setAvances(res.avances);
      setUltimoProgreso(res.ultimoProgreso);
    } catch (err: unknown) {
      setErrorAvances(
        extraerMensajeErrorVinculacion(
          err,
          'No se pudieron cargar los avances del proyecto.',
        ),
      );
    } finally {
      setCargandoAvances(false);
    }
  }, [idProyecto, idValido]);

  useEffect(() => {
    let activo = true;

    if (!idValido) {
      return;
    }

    async function cargarTodo() {
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
        setEstadoProyecto(proyecto.status ?? 'open');

        const proyectoAbierto = ['open', 'in_progress'].includes(
          proyecto.status ?? 'open',
        );

        let tieneAccesoLectura = false;
        let tienePermiso = false;
        let esResponsableProyecto = false;
        if (user) {
          const [misPubs, propias] = await Promise.all([
            listarMisPublicaciones().catch(() => []),
            listarMisSolicitudesEnviadas('accepted').catch(() => []),
          ]);
          esResponsableProyecto =
            Boolean(user.can_manage_platform) ||
            misPubs.some(
              (p) => p.type === 'proyecto' && p.id === idProyecto,
            );
          const esParticipanteAceptado = propias.some((s) => s.project_id === idProyecto);
          tieneAccesoLectura = esResponsableProyecto || esParticipanteAceptado;
          tienePermiso = proyectoAbierto && tieneAccesoLectura;
        }

        if (!activo) return;
        if (!tieneAccesoLectura) {
          setError('Solo el responsable y los participantes aceptados del proyecto pueden consultar los avances.');
          setEsDueno(false);
          setPuedeRegistrar(false);
          return;
        }
        setEsDueno(esResponsableProyecto);
        setPuedeRegistrar(tienePermiso);
        void cargarAvances();
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

    const timer = window.setTimeout(() => {
      void cargarTodo();
    }, 0);

    return () => {
      activo = false;
      window.clearTimeout(timer);
    };
  }, [idProyecto, idValido, user, cargarAvances]);

  async function manejarRegistroAvance(datos: NuevoAvanceProyecto) {
    const nuevo = await registrarAvanceProyecto(idProyecto, datos);
    setAvances((lista) => [nuevo, ...lista]);
    if (nuevo.progress !== null) {
      setUltimoProgreso({
        update_id: nuevo.id,
        progress: nuevo.progress,
        created_at: nuevo.created_at,
      });
    }
  }

  async function manejarCambioEstado(nuevoEstado: 'completed' | 'closed') {
    await api.patch(`/projects/${idProyecto}`, { status: nuevoEstado });
    setEstadoProyecto(nuevoEstado);
    setPuedeRegistrar(false);
  }

  async function manejarAsignarPorcentaje(updateId: number, progress: number) {
    const actualizado = await actualizarPorcentajeAvance(idProyecto, updateId, progress);
    setAvances((lista) =>
      lista.map((item) => (item.id === actualizado.id ? actualizado : item)),
    );
    if (actualizado.progress !== null) {
      setUltimoProgreso({
        update_id: actualizado.id,
        progress: actualizado.progress,
        created_at: actualizado.created_at,
      });
    }
  }

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
        estado: estadoProyecto,
      }}
      avances={avances}
      ultimoProgreso={ultimoProgreso}
      cargando={cargandoAvances}
      error={errorAvances}
      puedeRegistrar={puedeRegistrar}
      esDueno={esDueno}
      onRegistrar={manejarRegistroAvance}
      onAsignarPorcentaje={manejarAsignarPorcentaje}
      onCambiarEstado={manejarCambioEstado}
      onReintentar={() => void cargarAvances()}
    />
  );
}