import { useState } from 'react';
import { Link } from 'react-router-dom';

import type {
  EstadoSolicitud,
  SolicitudEnviada,
} from '../types/vinculacion';

import '../styles/solicitudesRecibidas.css';

type Filtro = 'todas' | EstadoSolicitud;

type Props = {
  solicitudes?: SolicitudEnviada[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
};

const ESTADOS: Record<
  EstadoSolicitud,
  { texto: string; clase: string }
> = {
  pending: {
    texto: 'Pendiente',
    clase: 'sr-pendiente',
  },
  accepted: {
    texto: 'Aceptada',
    clase: 'sr-aceptada',
  },
  rejected: {
    texto: 'Rechazada',
    clase: 'sr-rechazada',
  },
};

const FILTROS: Array<{ valor: Filtro; texto: string }> = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'pending', texto: 'Pendientes' },
  { valor: 'accepted', texto: 'Aceptadas' },
  { valor: 'rejected', texto: 'Rechazadas' },
];

function fechaLegible(fecha: string | null): string {
  if (!fecha) return 'Fecha no disponible';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'Fecha no disponible';
  }

  return valor.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SolicitudesEnviadasPage({
  solicitudes,
  cargando = false,
  error = null,
  onReintentar,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const pendienteIntegracion =
    solicitudes === undefined && !cargando && !error;

  const registros = solicitudes ?? [];

  const filtradas = registros.filter(
    (solicitud) =>
      filtro === 'todas' || solicitud.status === filtro,
  );

  const pendientes = registros.filter(
    (solicitud) => solicitud.status === 'pending',
  ).length;

  return (
    <main className="sr-pagina">
      <div className="sr-contenedor">
        <header className="sr-cabecera">
          <span className="sr-eyebrow">
            PROYECTATEC / MIS SOLICITUDES
          </span>

          <h1>Solicitudes enviadas</h1>

          <p>
            Consulta los proyectos en los que has solicitado
            participar y revisa el estado de tus solicitudes.
          </p>
        </header>

        <section
          className="sr-tarjeta"
          aria-labelledby="se-titulo"
        >
          <div className="sr-tarjeta-encabezado">
            <div>
              <h2 id="se-titulo">
                Mi historial de solicitudes
              </h2>

              {!pendienteIntegracion && !cargando && !error && (
                <p aria-live="polite">
                  {registros.length} solicitudes ·{' '}
                  {pendientes} pendientes
                </p>
              )}
            </div>
          </div>

          {!pendienteIntegracion && !cargando && !error && (
            <div
              className="sr-filtros"
              role="group"
              aria-label="Filtrar solicitudes enviadas"
            >
              {FILTROS.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  aria-pressed={filtro === opcion.valor}
                  className={
                    filtro === opcion.valor
                      ? 'sr-filtro-activo'
                      : ''
                  }
                  onClick={() => setFiltro(opcion.valor)}
                >
                  {opcion.texto}
                </button>
              ))}
            </div>
          )}

          {pendienteIntegracion && (
            <div className="sr-mensaje" role="status">
              <strong>Vista preparada para integración</strong>
              <p>
                El historial todavía no está conectado con
                Laravel. Aquí aparecerán tus solicitudes reales
                cuando se integre el servicio correspondiente.
              </p>
            </div>
          )}

          {cargando && (
            <p className="sr-mensaje" role="status">
              Cargando solicitudes enviadas…
            </p>
          )}

          {!cargando && error && (
            <div
              className="sr-mensaje sr-mensaje-error"
              role="alert"
            >
              <p>{error}</p>

              {onReintentar && (
                <button
                  type="button"
                  className="sr-boton"
                  onClick={onReintentar}
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

          {!pendienteIntegracion &&
            !cargando &&
            !error &&
            filtradas.length === 0 && (
              <div className="sr-mensaje" role="status">
                {registros.length === 0
                  ? 'Todavía no has enviado solicitudes de vinculación.'
                  : 'No tienes solicitudes con el estado seleccionado.'}
              </div>
            )}

          {!pendienteIntegracion &&
            !cargando &&
            !error &&
            filtradas.length > 0 && (
              <ul className="sr-lista">
                {filtradas.map((solicitud) => {
                  const estado = ESTADOS[solicitud.status];

                  return (
                    <li
                      key={solicitud.id}
                      className="sr-fila"
                    >
                      <div className="sr-solicitante">
                        <h3>
                          {solicitud.project?.title ||
                            'Proyecto no disponible'}
                        </h3>

                        {solicitud.project_need?.title && (
                          <p>
                            Necesidad:{' '}
                            {solicitud.project_need.title}
                          </p>
                        )}

                        {solicitud.message && (
                          <p>{solicitud.message}</p>
                        )}

                        <small>
                          Enviada el{' '}
                          {fechaLegible(solicitud.created_at)}
                        </small>
                      </div>

                      <span
                        className={`sr-estado ${estado.clase}`}
                      >
                        {estado.texto}
                      </span>

                      <Link
                        className="sr-revisar"
                        to={`/iniciativas/proyecto/${solicitud.project_id}`}
                      >
                        Ver proyecto →
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
        </section>

        <section
          className="sr-tarjeta sr-informacion"
          aria-labelledby="se-informacion"
        >
          <h2 id="se-informacion">
            ¿Qué significan los estados?
          </h2>

          <p>
            <strong>Pendiente:</strong> tu solicitud espera
            una decisión del responsable del proyecto.
          </p>

          <p>
            <strong>Aceptada:</strong> tu participación
            fue aprobada.
          </p>

          <p>
            <strong>Rechazada:</strong> el responsable
            decidió no aceptar la solicitud.
          </p>
        </section>
      </div>
    </main>
  );
}
