import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

import type {
  DatosSolicitudVinculacion,
  ErroresSolicitudVinculacion,
  NecesidadVinculacion,
  PerfilSolicitanteResumen,
} from '../../types/vinculacion';

import '../../styles/solicitudesVinculacion.css';

type Props = {
  proyecto: {
    id: number;
    titulo: string;
  };
  perfil: PerfilSolicitanteResumen;
  necesidades?: NecesidadVinculacion[];
  onCerrar: () => void;
  onEnviar?: (
    datos: DatosSolicitudVinculacion,
  ) => Promise<void>;
};

const VALORES_INICIALES: DatosSolicitudVinculacion = {
  project_need_id: null,
  message: '',
  tipo_apoyo: '',
  disponibilidad: '',
  expectativas: '',
  portafolio_url: '',
  github_url: '',
  linkedin_url: '',
  cv_pdf: null,
};

const MAX_CV_BYTES = 5 * 1024 * 1024;

function enlaceValido(valor: string): boolean {
  if (!valor.trim()) return true;

  try {
    const url = new URL(valor.trim());
    return (
      url.protocol === 'https:' ||
      url.protocol === 'http:'
    );
  } catch {
    return false;
  }
}

function validar(
  datos: DatosSolicitudVinculacion,
): ErroresSolicitudVinculacion {
  const errores: ErroresSolicitudVinculacion = {};

  const mensaje = datos.message.trim();

  if (mensaje.length < 20) {
    errores.message =
      'Explica tu motivo de colaboración en al menos 20 caracteres.';
  } else if (mensaje.length > 2000) {
    errores.message =
      'El mensaje no puede superar los 2000 caracteres.';
  }

  if (!datos.tipo_apoyo.trim()) {
    errores.tipo_apoyo =
      'Indica qué tipo de apoyo puedes ofrecer.';
  }

  if (!datos.disponibilidad.trim()) {
    errores.disponibilidad =
      'Indica tu disponibilidad para colaborar.';
  }

  if (datos.expectativas.length > 500) {
    errores.expectativas =
      'Las expectativas no pueden superar los 500 caracteres.';
  }

  const enlaces = [
    'portafolio_url',
    'github_url',
    'linkedin_url',
  ] as const;

  enlaces.forEach((campo) => {
    if (!enlaceValido(datos[campo])) {
      errores[campo] =
        'Ingresa un enlace válido que comience con https:// o http://.';
    }
  });

  if (datos.cv_pdf) {
    const archivo = datos.cv_pdf;

    if (
      archivo.type !== 'application/pdf' &&
      !archivo.name.toLowerCase().endsWith('.pdf')
    ) {
      errores.cv_pdf = 'Selecciona un archivo PDF.';
    } else if (archivo.size > MAX_CV_BYTES) {
      errores.cv_pdf =
        'El archivo no puede superar los 5 MB.';
    }
  }

  return errores;
}

export default function SolicitarVinculacionModal({
  proyecto,
  perfil,
  necesidades = [],
  onCerrar,
  onEnviar,
}: Props) {
  const modalRef = useRef<HTMLElement>(null);

  const [valores, setValores] =
    useState<DatosSolicitudVinculacion>({
      ...VALORES_INICIALES,
    });

  const [errores, setErrores] =
    useState<ErroresSolicitudVinculacion>({});

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorGeneral, setErrorGeneral] =
    useState<string | null>(null);

  const necesidadesAbiertas = necesidades.filter(
    (necesidad) => necesidad.disponible !== false,
  );

  // Bloquear el desplazamiento de fondo y recuperar el foco al cerrar.
  useEffect(() => {
    const elementoPrevio =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;
      elementoPrevio?.focus();
    };
  }, []);

  function cambiar<K extends keyof DatosSolicitudVinculacion>(
    campo: K,
    valor: DatosSolicitudVinculacion[K],
  ) {
    setValores((actuales) => ({
      ...actuales,
      [campo]: valor,
    }));

    setErrores((actuales) => ({
      ...actuales,
      [campo]: undefined,
    }));
  }

  function controlarTeclado(
    evento: KeyboardEvent<HTMLElement>,
  ) {
    if (evento.key === 'Escape' && !enviando) {
      onCerrar();
      return;
    }

    if (evento.key !== 'Tab') return;

    const elementos = modalRef.current?.querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLSelectElement |
      HTMLTextAreaElement
    >(
      'button:not(:disabled), input:not(:disabled), ' +
      'select:not(:disabled), textarea:not(:disabled)',
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

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!onEnviar || enviando) return;

    const erroresNuevos = validar(valores);
    setErrores(erroresNuevos);

    if (Object.keys(erroresNuevos).length > 0) return;

    setEnviando(true);
    setErrorGeneral(null);

    try {
      await onEnviar({
        ...valores,
        message: valores.message.trim(),
        tipo_apoyo: valores.tipo_apoyo.trim(),
        disponibilidad: valores.disponibilidad.trim(),
        expectativas: valores.expectativas.trim(),
        portafolio_url: valores.portafolio_url.trim(),
        github_url: valores.github_url.trim(),
        linkedin_url: valores.linkedin_url.trim(),
      });

      setEnviado(true);
    } catch {
      setErrorGeneral(
        'No se pudo enviar la solicitud. Inténtalo nuevamente.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="sv-fondo"
      onMouseDown={(evento) => {
        if (
          evento.target === evento.currentTarget &&
          !enviando
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
        aria-labelledby="sv-titulo"
        aria-describedby="sv-descripcion"
        tabIndex={-1}
        onKeyDown={controlarTeclado}
      >
        <header className="sv-encabezado">
          <div>
            <span className="sv-eyebrow">
              PROYECTATEC / VINCULACIÓN
            </span>
            <h2 id="sv-titulo">Solicitar vinculación</h2>
            <p id="sv-descripcion">
              Comparte cómo te gustaría colaborar en este proyecto.
            </p>
          </div>

          <button
            type="button"
            className="sv-cerrar"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar formulario"
          >
            ×
          </button>
        </header>

        {enviado ? (
          <div className="sv-contenido sv-exito" role="status">
            <h3>Solicitud enviada correctamente</h3>
            <p>
              Tu solicitud fue registrada. Podrás consultar su
              estado en el apartado de solicitudes enviadas.
            </p>
            <button
              type="button"
              className="sv-boton sv-primario"
              onClick={onCerrar}
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={(evento) => void enviar(evento)} noValidate>
            <div className="sv-contenido">
              <div className="sv-proyecto">
                <span>PROYECTO SELECCIONADO</span>
                <strong>{proyecto.titulo}</strong>
              </div>

              <section className="sv-seccion">
                <h3>Tu información</h3>
                <p className="sv-ayuda">
                  Estos datos provienen de tu perfil y son solo
                  de lectura. La información compartida deberá
                  respetar la visibilidad de tu perfil.
                </p>

                <div className="sv-perfil">
                  <div>
                    <small>Nombre</small>
                    <strong>{perfil.nombre}</strong>
                  </div>

                  {perfil.institucion && (
                    <div>
                      <small>Institución</small>
                      <strong>{perfil.institucion}</strong>
                    </div>
                  )}

                  {perfil.area && (
                    <div>
                      <small>Área o especialidad</small>
                      <strong>{perfil.area}</strong>
                    </div>
                  )}

                  {perfil.ubicacion && (
                    <div>
                      <small>Ubicación</small>
                      <strong>{perfil.ubicacion}</strong>
                    </div>
                  )}

                  {perfil.descripcion && (
                    <div className="sv-perfil-descripcion">
                      <small>Acerca de ti</small>
                      <p>{perfil.descripcion}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="sv-seccion">
                <h3>Propuesta de colaboración</h3>

                {necesidadesAbiertas.length > 0 && (
                  <div className="sv-campo">
                    <label htmlFor="sv-necesidad">
                      Necesidad del proyecto
                      <span className="sv-opcional"> (opcional)</span>
                    </label>
                    <select
                      id="sv-necesidad"
                      name="project_need_id"
                      value={valores.project_need_id ?? ''}
                      onChange={(evento) =>
                        cambiar(
                          'project_need_id',
                          evento.target.value
                            ? Number(evento.target.value)
                            : null,
                        )
                      }
                      disabled={enviando}
                    >
                      <option value="">
                        Colaboración general con el proyecto
                      </option>

                      {necesidadesAbiertas.map((necesidad) => (
                        <option
                          key={necesidad.id}
                          value={necesidad.id}
                        >
                          {necesidad.titulo}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="sv-campo">
                  <label htmlFor="sv-mensaje">
                    ¿Por qué quieres participar? *
                  </label>
                  <textarea
                    id="sv-mensaje"
                    name="message"
                    rows={4}
                    maxLength={2000}
                    value={valores.message}
                    onChange={(evento) =>
                      cambiar('message', evento.target.value)
                    }
                    placeholder="Explica qué te motiva a participar y cómo podrías contribuir."
                    aria-invalid={Boolean(errores.message)}
                    aria-describedby={
                      errores.message
                        ? 'sv-mensaje-error'
                        : 'sv-mensaje-ayuda'
                    }
                    disabled={enviando}
                  />
                  <div className="sv-campo-pie">
                    <small id="sv-mensaje-ayuda">
                      Mínimo 20 caracteres.
                    </small>
                    <small>{valores.message.length}/2000</small>
                  </div>
                  {errores.message && (
                    <p id="sv-mensaje-error" className="sv-error">
                      {errores.message}
                    </p>
                  )}
                </div>

                <div className="sv-dos-columnas">
                  <div className="sv-campo">
                    <label htmlFor="sv-tipo-apoyo">
                      Tipo de apoyo que ofreces *
                    </label>
                    <input
                      id="sv-tipo-apoyo"
                      name="tipo_apoyo"
                      type="text"
                      maxLength={150}
                      value={valores.tipo_apoyo}
                      onChange={(evento) =>
                        cambiar('tipo_apoyo', evento.target.value)
                      }
                      placeholder="Ej. Desarrollo de software"
                      aria-invalid={Boolean(errores.tipo_apoyo)}
                      disabled={enviando}
                    />
                    {errores.tipo_apoyo && (
                      <p className="sv-error">{errores.tipo_apoyo}</p>
                    )}
                  </div>

                  <div className="sv-campo">
                    <label htmlFor="sv-disponibilidad">
                      Disponibilidad u horarios *
                    </label>
                    <input
                      id="sv-disponibilidad"
                      name="disponibilidad"
                      type="text"
                      maxLength={150}
                      value={valores.disponibilidad}
                      onChange={(evento) =>
                        cambiar(
                          'disponibilidad',
                          evento.target.value,
                        )
                      }
                      placeholder="Ej. Tardes y fines de semana"
                      aria-invalid={Boolean(errores.disponibilidad)}
                      disabled={enviando}
                    />
                    {errores.disponibilidad && (
                      <p className="sv-error">
                        {errores.disponibilidad}
                      </p>
                    )}
                  </div>
                </div>

                <div className="sv-campo">
                  <label htmlFor="sv-expectativas">
                    Expectativas o compromisos
                    <span className="sv-opcional"> (opcional)</span>
                  </label>
                  <textarea
                    id="sv-expectativas"
                    name="expectativas"
                    rows={3}
                    maxLength={500}
                    value={valores.expectativas}
                    onChange={(evento) =>
                      cambiar('expectativas', evento.target.value)
                    }
                    placeholder="Comparte qué esperas de esta colaboración."
                    aria-invalid={Boolean(errores.expectativas)}
                    disabled={enviando}
                  />
                  {errores.expectativas && (
                    <p className="sv-error">
                      {errores.expectativas}
                    </p>
                  )}
                </div>
              </section>

              <section className="sv-seccion">
                <h3>Experiencia y enlaces</h3>
                <p className="sv-ayuda">
                  Puedes complementar tu solicitud con enlaces a
                  tus trabajos o experiencia previa.
                </p>

                <div className="sv-campo">
                  <label htmlFor="sv-portafolio">
                    Portafolio
                    <span className="sv-opcional"> (opcional)</span>
                  </label>
                  <input
                    id="sv-portafolio"
                    name="portafolio_url"
                    type="url"
                    value={valores.portafolio_url}
                    onChange={(evento) =>
                      cambiar(
                        'portafolio_url',
                        evento.target.value,
                      )
                    }
                    placeholder="https://mi-portafolio.com"
                    aria-invalid={Boolean(errores.portafolio_url)}
                    disabled={enviando}
                  />
                  {errores.portafolio_url && (
                    <p className="sv-error">
                      {errores.portafolio_url}
                    </p>
                  )}
                </div>

                <div className="sv-dos-columnas">
                  <div className="sv-campo">
                    <label htmlFor="sv-github">
                      GitHub
                      <span className="sv-opcional"> (opcional)</span>
                    </label>
                    <input
                      id="sv-github"
                      name="github_url"
                      type="url"
                      value={valores.github_url}
                      onChange={(evento) =>
                        cambiar('github_url', evento.target.value)
                      }
                      placeholder="https://github.com/usuario"
                      aria-invalid={Boolean(errores.github_url)}
                      disabled={enviando}
                    />
                    {errores.github_url && (
                      <p className="sv-error">
                        {errores.github_url}
                      </p>
                    )}
                  </div>

                  <div className="sv-campo">
                    <label htmlFor="sv-linkedin">
                      LinkedIn
                      <span className="sv-opcional"> (opcional)</span>
                    </label>
                    <input
                      id="sv-linkedin"
                      name="linkedin_url"
                      type="url"
                      value={valores.linkedin_url}
                      onChange={(evento) =>
                        cambiar('linkedin_url', evento.target.value)
                      }
                      placeholder="https://linkedin.com/in/usuario"
                      aria-invalid={Boolean(errores.linkedin_url)}
                      disabled={enviando}
                    />
                    {errores.linkedin_url && (
                      <p className="sv-error">
                        {errores.linkedin_url}
                      </p>
                    )}
                  </div>
                </div>

                <div className="sv-campo">
                  <label htmlFor="sv-cv">
                    Currículum en PDF
                    <span className="sv-opcional"> (opcional)</span>
                  </label>
                  <input
                    id="sv-cv"
                    name="cv_pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(evento) =>
                      cambiar(
                        'cv_pdf',
                        evento.target.files?.[0] ?? null,
                      )
                    }
                    aria-invalid={Boolean(errores.cv_pdf)}
                    aria-describedby="sv-cv-ayuda"
                    disabled={enviando}
                  />
                  <small id="sv-cv-ayuda" className="sv-ayuda">
                    Formato PDF. Límite provisional: 5 MB.
                  </small>
                  {valores.cv_pdf && (
                    <small className="sv-archivo">
                      Archivo seleccionado: {valores.cv_pdf.name}
                    </small>
                  )}
                  {errores.cv_pdf && (
                    <p className="sv-error">{errores.cv_pdf}</p>
                  )}
                </div>
              </section>

              {errorGeneral && (
                <p className="sv-alerta" role="alert">
                  {errorGeneral}
                </p>
              )}

              {!onEnviar && (
                <p className="sv-pendiente" role="status">
                  Formulario preparado para integración. El envío
                  se habilitará cuando se conecte el servicio de
                  solicitudes de Laravel.
                </p>
              )}
            </div>

            <footer className="sv-acciones">
              <button
                type="button"
                className="sv-boton sv-secundario"
                onClick={onCerrar}
                disabled={enviando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="sv-boton sv-primario"
                disabled={enviando || !onEnviar}
              >
                {enviando
                  ? 'Enviando solicitud…'
                  : 'Enviar solicitud'}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
