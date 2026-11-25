import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { extraerMensajeErrorVinculacion } from '../../api/vinculacionSeguimientoService';

import type {
  SolicitudRecibida,
  EstadoSolicitud,
} from '../../types/vinculacion';

import '../../styles/solicitudesVinculacion.css';
import '../../styles/revisarSolicitud.css';

type Decision = Extract<
  EstadoSolicitud,
  'accepted' | 'rejected'
>;

type Props = {
  solicitud: SolicitudRecibida;
  onCerrar: () => void;
  onResolver?: (
    id: number,
    decision: Decision,
    notas: string,
  ) => Promise<void>;
  onVerPerfil?: (perfilId: number) => void;
};

const ESTADOS = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
};

function fechaLegible(fecha?: string | null): string {
  if (!fecha) return 'No disponible';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'No disponible';
  }

  return valor.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function enlaceSeguro(valor?: string | null): string | null {
  if (!valor) return null;

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://proyectatec.lat';
    const url = new URL(valor, base);

    return ['http:', 'https:'].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export default function RevisarSolicitudModal({
  solicitud,
  onCerrar,
  onResolver,
  onVerPerfil,
}: Props) {
  const modalRef = useRef<HTMLElement>(null);

  const [decision, setDecision] = useState<Decision | null>(
    null,
  );

  const [notas, setNotas] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmacionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (decision && confirmacionRef.current) {
      confirmacionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [decision]);

  const pendiente = solicitud.status === 'pending';

  const nombre =
    solicitud.applicant?.display_name?.trim() ||
    solicitud.applicant?.name ||
    'Solicitante';

  const perfilId = solicitud.applicant?.profile_id;

  const enlaces = [
    {
      texto: 'Portafolio',
      url: enlaceSeguro(solicitud.portafolio_url),
    },
    {
      texto: 'GitHub',
      url: enlaceSeguro(solicitud.github_url),
    },
    {
      texto: 'LinkedIn',
      url: enlaceSeguro(solicitud.linkedin_url),
    },
    {
      texto: solicitud.cv_original_name
        ? `Currículum PDF (${solicitud.cv_original_name})`
        : 'Currículum PDF',
      url: enlaceSeguro(solicitud.cv_url),
    },
  ].filter(
    (enlace): enlace is { texto: string; url: string } =>
      enlace.url !== null,
  );

  useEffect(() => {
    const anterior =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    modalRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);

  function manejarTeclado(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key === 'Escape' && !procesando) {
      onCerrar();
      return;
    }

    if (evento.key !== 'Tab') return;

    const elementos = modalRef.current?.querySelectorAll<
      HTMLButtonElement | HTMLTextAreaElement | HTMLAnchorElement
    >(
      'button:not(:disabled), textarea:not(:disabled), a[href]',
    );

    if (!elementos?.length) return;

    const primero = elementos[0];
    const ultimo = elementos[elementos.length - 1];

    if (
      evento.shiftKey &&
      document.activeElement === primero
    ) {
      evento.preventDefault();
      ultimo.focus();
    } else if (
      !evento.shiftKey &&
      document.activeElement === ultimo
    ) {
      evento.preventDefault();
      primero.focus();
    }
  }

  async function confirmarDecision() {
    if (!decision || !onResolver || procesando || !pendiente) {
      return;
    }

    setProcesando(true);
    setError(null);

    try {
      await onResolver(solicitud.id, decision, notas.trim());
      onCerrar();
    } catch (err: unknown) {
      setError(
        extraerMensajeErrorVinculacion(
          err,
          'No se pudo actualizar la solicitud. Inténtalo nuevamente.',
        ),
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div
      className="sv-fondo"
      onMouseDown={(evento) => {
        if (
          evento.target === evento.currentTarget &&
          !procesando
        ) {
          onCerrar();
        }
      }}
    >
      <section
        ref={modalRef}
        className="sv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rv-titulo"
        aria-describedby="rv-descripcion"
        tabIndex={-1}
        onKeyDown={manejarTeclado}
      >
        <header className="sv-encabezado">
          <div>
            <span className="sv-eyebrow">
              PROYECTATEC / SOLICITUDES
            </span>

            <h2 id="rv-titulo">Revisar solicitud</h2>

            <p id="rv-descripcion">
              Consulta la propuesta antes de tomar una decisión.
            </p>
          </div>

          <button
            type="button"
            className="sv-cerrar"
            onClick={onCerrar}
            disabled={procesando}
            aria-label="Cerrar revisión"
          >
            ×
          </button>
        </header>

        <div className="sv-contenido">
          <div className="sv-proyecto">
            <span>PROYECTO</span>
            <strong>
              {solicitud.project?.title ||
                'Proyecto no disponible'}
            </strong>
          </div>

          <section className="sv-seccion">
            <h3>Información del solicitante</h3>

            <div className="rv-datos">
              <div>
                <small>Nombre</small>
                <strong>{nombre}</strong>
              </div>

              <div>
                <small>Estado de la solicitud</small>
                <strong
                  className={`rv-estado rv-${solicitud.status}`}
                >
                  {ESTADOS[solicitud.status]}
                </strong>
              </div>

              <div>
                <small>Fecha de solicitud</small>
                <strong>
                  {fechaLegible(solicitud.created_at)}
                </strong>
              </div>

              {solicitud.project_need && (
                <div>
                  <small>Necesidad seleccionada</small>
                  <strong>
                    {solicitud.project_need.title}
                  </strong>
                </div>
              )}
            </div>

            {typeof perfilId === 'number' && perfilId > 0 &&
              onVerPerfil && (
                <button
                  type="button"
                  className="rv-enlace-perfil"
                  onClick={() => onVerPerfil(perfilId)}
                  disabled={procesando}
                >
                  Ver perfil del solicitante →
                </button>
              )}
          </section>

          <section className="sv-seccion">
            <h3>Propuesta de colaboración</h3>

            <div className="rv-mensaje">
              <small>Motivo de la solicitud</small>

              <p>
                {solicitud.message?.trim() ||
                  'No se proporcionó un mensaje.'}
              </p>
            </div>

            {(solicitud.tipo_apoyo ||
              solicitud.disponibilidad ||
              solicitud.expectativas) && (
              <div className="rv-datos">
                {solicitud.tipo_apoyo && (
                  <div>
                    <small>Tipo de apoyo</small>
                    <strong>{solicitud.tipo_apoyo}</strong>
                  </div>
                )}

                {solicitud.disponibilidad && (
                  <div>
                    <small>Disponibilidad</small>
                    <strong>{solicitud.disponibilidad}</strong>
                  </div>
                )}

                {solicitud.expectativas && (
                  <div className="rv-ancho-completo">
                    <small>Expectativas o compromisos</small>
                    <p>{solicitud.expectativas}</p>
                  </div>
                )}
              </div>
            )}

            {enlaces.length > 0 && (
              <div>
                <h4 className="rv-subtitulo">
                  Experiencia y archivos
                </h4>

                <div className="rv-enlaces">
                  {enlaces.map((enlace) => (
                    <a
                      key={enlace.texto}
                      href={enlace.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {enlace.texto} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          {!pendiente && (
            <section className="sv-seccion">
              <h3>Resultado de la revisión</h3>

              <p className="rv-descripcion">
                Esta solicitud ya fue{' '}
                {solicitud.status === 'accepted'
                  ? 'aceptada'
                  : 'rechazada'}
                {solicitud.reviewed_at
                  ? ` el ${fechaLegible(solicitud.reviewed_at)}`
                  : ''}
                .
              </p>

              {solicitud.review_notes && (
                <div className="rv-mensaje">
                  <small>Notas de revisión</small>
                  <p>{solicitud.review_notes}</p>
                </div>
              )}
            </section>
          )}

          {pendiente && decision && (
            <section
              ref={confirmacionRef}
              className="rv-confirmacion"
              aria-labelledby="rv-confirmar-titulo"
            >
              <h3 id="rv-confirmar-titulo">
                {decision === 'accepted'
                  ? '¿Aceptar esta solicitud?'
                  : '¿Rechazar esta solicitud?'}
              </h3>

              <p>
                {decision === 'accepted'
                  ? 'Confirma que deseas aceptar la colaboración de esta persona.'
                  : 'Confirma que deseas rechazar esta propuesta de colaboración.'}
              </p>

              <label htmlFor="rv-notas">
                Notas de revisión (opcional)
              </label>

              <textarea
                id="rv-notas"
                value={notas}
                onChange={(evento) =>
                  setNotas(evento.target.value)
                }
                rows={3}
                maxLength={1000}
                disabled={procesando}
                placeholder="Escribe un comentario para el solicitante."
              />

              <small>{notas.length}/1000 caracteres</small>

              <div className="rv-confirmacion-acciones">
                <button
                  type="button"
                  className="sv-boton sv-secundario"
                  onClick={() => {
                    setDecision(null);
                    setError(null);
                  }}
                  disabled={procesando}
                >
                  Volver
                </button>

                <button
                  type="button"
                  className={
                    decision === 'accepted'
                      ? 'sv-boton sv-primario'
                      : 'sv-boton rv-boton-rechazar'
                  }
                  onClick={() => void confirmarDecision()}
                  disabled={procesando || !onResolver}
                >
                  {procesando
                    ? 'Guardando…'
                    : decision === 'accepted'
                      ? 'Confirmar aceptación'
                      : 'Confirmar rechazo'}
                </button>
              </div>
            </section>
          )}

          {error && (
            <p className="sv-alerta" role="alert">
              {error}
            </p>
          )}

          {pendiente && !onResolver && (
            <p className="sv-pendiente" role="status">
              La revisión está preparada para su integración.
              Las decisiones se habilitarán cuando se conecte
              el servicio de solicitudes.
            </p>
          )}
        </div>

        <footer className="sv-acciones">
          {pendiente && !decision && (
            <>
              <button
                type="button"
                className="sv-boton rv-boton-rechazar"
                onClick={() => setDecision('rejected')}
                disabled={procesando || !onResolver}
              >
                Rechazar
              </button>

              <button
                type="button"
                className="sv-boton sv-primario"
                onClick={() => setDecision('accepted')}
                disabled={procesando || !onResolver}
              >
                Aceptar solicitud
              </button>
            </>
          )}

          <button
            type="button"
            className="sv-boton sv-secundario"
            onClick={onCerrar}
            disabled={procesando}
          >
            Cerrar
          </button>
        </footer>
      </section>
    </div>
  );
}