import { useState } from 'react';

import type {
  EstadoSolicitud,
  SolicitudRecibida,
} from '../../types/vinculacion';

import '../../styles/solicitudesRecibidas.css';

type Filtro = 'todas' | EstadoSolicitud;

type Props = {
  solicitudes: SolicitudRecibida[];
  cargando?: boolean;
  error?: string | null;
  onRevisar?: (solicitud: SolicitudRecibida) => void;
  onReintentar?: () => void;
  pendienteIntegracion?: boolean;
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
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SolicitudesRecibidas({
  solicitudes,
  cargando = false,
  error = null,
  onRevisar,
  onReintentar,
  pendienteIntegracion = false,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const filtradas = solicitudes.filter(
    (solicitud) =>
      filtro === 'todas' || solicitud.status === filtro,
  );

  const pendientes = solicitudes.filter(
    (solicitud) => solicitud.status === 'pending',
  ).length;

  return (
    <main className="sr-pagina">
      <div className="sr-contenedor">
        <header className="sr-cabecera">
          <span className="sr-eyebrow">
            PROYECTATEC / SOLICITUDES
          </span>

          <h1>Solicitudes de vinculación</h1>

          <p>
            Revisa las personas y organizaciones interesadas
            en colaborar.
          </p>
        </header>

        <section
          className="sr-tarjeta"
          aria-labelledby="sr-recibidas-titulo"
        >
          <div className="sr-tarjeta-encabezado">
            <div>
              <h2 id="sr-recibidas-titulo">
                Solicitudes recibidas
              </h2>

              {!pendienteIntegracion && !cargando && !error && (
                <p aria-live="polite">
                    {solicitudes.length} solicitudes ·{' '}
                    {pendientes} pendientes
                </p>
                )}
            </div>
          </div>

          {!pendienteIntegracion && (
            <div
                className="sr-filtros"
                role="group"
                aria-label="Filtrar solicitudes por estado"
            >
                {FILTROS.map((opcion) => (
                <button
                    key={opcion.valor}
                    type="button"
                    className={
                    filtro === opcion.valor ? 'sr-filtro-activo' : ''
                    }
                    aria-pressed={filtro === opcion.valor}
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
                La consulta de solicitudes recibidas todavía no está
                conectada con Laravel. Cuando se integre el servicio,
                aquí aparecerán las solicitudes reales del proyecto.
                </p>
            </div>
            )}
          {cargando && (
            <p className="sr-mensaje" role="status">
              Cargando solicitudes recibidas…
            </p>
          )}

          {!pendienteIntegracion && !cargando && !error && (
            <div className="sr-mensaje sr-mensaje-error" role="alert">
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

          {!pendienteIntegracion && !cargando && !error && filtradas.length === 0 && (
            <div className="sr-mensaje" role="status">
              {solicitudes.length === 0
                ? 'Todavía no tienes solicitudes recibidas.'
                : 'No hay solicitudes con el estado seleccionado.'}
            </div>
          )}

          {!pendienteIntegracion && !cargando && !error && filtradas.length > 0 && (
            <ul className="sr-lista">
              {filtradas.map((solicitud) => {
                const estado = ESTADOS[solicitud.status];

                const nombre =
                  solicitud.applicant?.display_name?.trim() ||
                  solicitud.applicant?.name ||
                  'Solicitante';

                return (
                  <li className="sr-fila" key={solicitud.id}>
                    <div className="sr-solicitante">
                      <h3>{nombre}</h3>

                      <p>
                        {solicitud.project?.title ??
                          'Proyecto no disponible'}
                        {solicitud.project_need?.title
                          ? ` · ${solicitud.project_need.title}`
                          : ''}
                      </p>

                      <small>
                        Recibida el{' '}
                        {fechaLegible(solicitud.created_at)}
                      </small>
                    </div>

                    <span
                      className={`sr-estado ${estado.clase}`}
                    >
                      {estado.texto}
                    </span>

                    <button
                      type="button"
                      className="sr-revisar"
                      onClick={() => onRevisar?.(solicitud)}
                      disabled={!onRevisar}
                      title={
                        !onRevisar
                          ? 'La revisión se habilitará al integrar el formulario.'
                          : undefined
                      }
                      aria-label={`Revisar solicitud de ${nombre}`}
                    >
                      Revisar <span aria-hidden="true">→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="sr-tarjeta sr-informacion"
          aria-labelledby="sr-informacion-titulo"
        >
          <h2 id="sr-informacion-titulo">Información</h2>

          <p>
            Revisa cada solicitud para conocer la propuesta de
            colaboración, consultar el perfil del solicitante y
            decidir si deseas aceptar o rechazar su solicitud.
          </p>
        </section>
      </div>
    </main>
  );
}
