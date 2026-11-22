import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  extraerMensajeErrorVinculacion,
  listarSolicitudesProyecto,
  resolverSolicitudVinculacion,
} from '../api/vinculacionSeguimientoService';

import SolicitudesRecibidas from '../components/vinculacion/SolicitudesRecibidas';
import RevisarSolicitudModal from '../components/vinculacion/RevisarSolicitudModal';

import type {
  EstadoSolicitud,
  SolicitudRecibida,
} from '../types/vinculacion';

type Decision = Extract<
  EstadoSolicitud,
  'accepted' | 'rejected'
>;

type Props = {
  solicitudes?: SolicitudRecibida[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onResolver?: (
    id: number,
    decision: Decision,
    notas: string,
  ) => Promise<void>;
  onVerPerfil?: (perfilId: number) => void;
};

export default function SolicitudesRecibidasPage({
  solicitudes,
  cargando,
  error,
  onReintentar,
  onResolver,
  onVerPerfil,
}: Props) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [seleccionada, setSeleccionada] =
    useState<SolicitudRecibida | null>(null);
  const [datosLocales, setDatosLocales] = useState<SolicitudRecibida[]>([]);
  const [cargandoLocal, setCargandoLocal] = useState(solicitudes === undefined);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const idProyecto = Number(projectId);

  const idValido =
    Number.isSafeInteger(idProyecto) && idProyecto > 0;

  const esControlado = solicitudes !== undefined;

  const cargar = useCallback(async () => {
    if (esControlado || !idValido) return;
    setCargandoLocal(true);
    setErrorLocal(null);
    try {
      const lista = await listarSolicitudesProyecto(idProyecto);
      setDatosLocales(lista);
    } catch (err: unknown) {
      setErrorLocal(
        extraerMensajeErrorVinculacion(
          err,
          'No se pudieron cargar las solicitudes recibidas de este proyecto.',
        ),
      );
    } finally {
      setCargandoLocal(false);
    }
  }, [esControlado, idProyecto, idValido]);

  useEffect(() => {
    if (esControlado || !idValido) return;
    const timer = window.setTimeout(() => {
      void cargar();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cargar, esControlado, idValido]);

  async function manejarResolucion(
    id: number,
    decision: Decision,
    notas: string,
  ) {
    if (onResolver) {
      await onResolver(id, decision, notas);
      return;
    }

    const actualizada = await resolverSolicitudVinculacion(
      id,
      decision,
      notas,
    );

    setDatosLocales((lista) =>
      lista.map((item) => (item.id === actualizada.id ? actualizada : item)),
    );
  }

  function manejarVerPerfil(perfilId: number) {
    if (onVerPerfil) {
      onVerPerfil(perfilId);
      return;
    }
    navigate(`/perfiles/${perfilId}`);
  }

  if (!idValido) {
    return (
      <main className="sr-pagina">
        <div className="sr-contenedor">
          <section className="sr-tarjeta">
            <h1>Proyecto no válido</h1>
            <p>
              No se pudo identificar el proyecto del que
              deseas consultar las solicitudes.
            </p>
            <Link to="/mis-publicaciones">
              Volver a mis publicaciones
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const registros = esControlado ? solicitudes : datosLocales;
  const estaCargando = cargando ?? cargandoLocal;
  const mensajeError = error !== undefined ? error : errorLocal;
  const reintentar = onReintentar ?? (() => void cargar());

  const solicitudesProyecto = registros.filter(
    (solicitud) => solicitud.project_id === idProyecto,
  );

  return (
    <>
      <SolicitudesRecibidas
        solicitudes={solicitudesProyecto}
        cargando={estaCargando}
        error={mensajeError}
        onReintentar={reintentar}
        pendienteIntegracion={false}
        onRevisar={(solicitud) => setSeleccionada(solicitud)}
      />

      {seleccionada && (
        <RevisarSolicitudModal
          solicitud={seleccionada}
          onCerrar={() => setSeleccionada(null)}
          onResolver={manejarResolucion}
          onVerPerfil={manejarVerPerfil}
        />
      )}
    </>
  );
}