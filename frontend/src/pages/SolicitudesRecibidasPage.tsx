import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

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
  cargando = false,
  error = null,
  onReintentar,
  onResolver,
  onVerPerfil,
}: Props) {
  const { projectId } = useParams<{ projectId: string }>();

  const [seleccionada, setSeleccionada] =
    useState<SolicitudRecibida | null>(null);

  const idProyecto = Number(projectId);

  const idValido =
    Number.isSafeInteger(idProyecto) && idProyecto > 0;

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

  const solicitudesProyecto = (solicitudes ?? []).filter(
    (solicitud) => solicitud.project_id === idProyecto,
  );

  return (
    <>
      <SolicitudesRecibidas
        solicitudes={solicitudesProyecto}
        cargando={cargando}
        error={error}
        onReintentar={onReintentar}
        pendienteIntegracion={solicitudes === undefined}
        onRevisar={(solicitud) => setSeleccionada(solicitud)}
      />

      {seleccionada && (
        <RevisarSolicitudModal
          solicitud={seleccionada}
          onCerrar={() => setSeleccionada(null)}
          onResolver={onResolver}
          onVerPerfil={onVerPerfil}
        />
      )}
    </>
  );
}
