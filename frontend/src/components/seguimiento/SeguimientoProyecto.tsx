import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import type {
  AvanceProyecto,
  NuevoAvanceProyecto,
  UltimoProgresoProyecto,
} from '../../types/seguimientoProyecto';

import '../../styles/seguimientoProyecto.css';

type Props = {
  proyecto: {
    id: number;
    titulo: string;
  };
  avances?: AvanceProyecto[];
  ultimoProgreso?: UltimoProgresoProyecto | null;
  cargando?: boolean;
  error?: string | null;
  puedeRegistrar?: boolean;
  onRegistrar?: (datos: NuevoAvanceProyecto) => Promise<void>;
  onReintentar?: () => void;
};

function fechaLegible(fecha: string | null): string {
  if (!fecha) return 'Fecha no disponible';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'Fecha no disponible';
  }

  return valor.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SeguimientoProyecto({
  proyecto,
  avances,
  ultimoProgreso,
  cargando = false,
  error = null,
  puedeRegistrar = false,
  onRegistrar,
  onReintentar,
}: Props) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [progreso, setProgreso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] =
    useState<string | null>(null);

  const pendienteIntegracion =
    avances === undefined && !cargando && !error;

  const ordenados = useMemo(
    () =>
      [...(avances ?? [])].sort((a, b) => {
        const fechaA = Date.parse(a.created_at ?? '') || 0;
        const fechaB = Date.parse(b.created_at ?? '') || 0;
        return fechaB - fechaA || b.id - a.id;
      }),
    [avances],
  );

  const progresoActual =
    ultimoProgreso?.progress ??
    ordenados.find((avance) => avance.progress !== null)
      ?.progress ??
    null;

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!puedeRegistrar || !onRegistrar || guardando) return;

    const tituloLimpio = titulo.trim();
    const descripcionLimpia = descripcion.trim();
    const progresoLimpio = progreso.trim();

    if (!tituloLimpio || !descripcionLimpia) {
      setErrorFormulario(
        'Completa el título y la descripción del avance.',
      );
      return;
    }

    if (tituloLimpio.length > 255) {
      setErrorFormulario(
        'El título no puede superar los 255 caracteres.',
      );
      return;
    }

    if (
      progresoLimpio !== '' &&
      (!/^\d+$/.test(progresoLimpio) ||
        Number(progresoLimpio) > 100)
    ) {
      setErrorFormulario(
        'El porcentaje debe ser un número entero entre 0 y 100.',
      );
      return;
    }

    setErrorFormulario(null);
    setGuardando(true);

    try {
      await onRegistrar({
        title: tituloLimpio,
        description: descripcionLimpia,
        progress:
          progresoLimpio === ''
            ? null
            : Number(progresoLimpio),
      });

      setTitulo('');
      setDescripcion('');
      setProgreso('');
    } catch {
      setErrorFormulario(
        'No se pudo registrar el avance. Inténtalo nuevamente.',
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="sp-pagina">
      <div className="sp-contenedor">
        <header className="sp-cabecera">
          <span className="sp-eyebrow">
            PROYECTATEC / SEGUIMIENTO
          </span>

          <h1>Seguimiento de avances</h1>

          <p>
            Consulta el progreso y las actividades registradas
            durante el desarrollo del proyecto.
          </p>
        </header>

        <section
          className="sp-tarjeta sp-resumen"
          aria-labelledby="sp-resumen-titulo"
        >
          <div>
            <span className="sp-etiqueta">PROYECTO</span>
            <h2 id="sp-resumen-titulo">
              {proyecto.titulo}
            </h2>
            <p>Avance general del proyecto</p>
          </div>

          {!pendienteIntegracion &&
          !cargando &&
          !error &&
          progresoActual !== null ? (
            <div className="sp-indicador">
              <strong>{progresoActual}%</strong>

              <div
                className="sp-barra"
                role="progressbar"
                aria-label="Progreso del proyecto"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progresoActual}
              >
                <div
                  style={{ width: `${progresoActual}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="sp-sin-progreso">
              {!pendienteIntegracion && !cargando && !error
                ? 'Sin porcentaje registrado'
                : 'Progreso no disponible'}
            </span>
          )}
        </section>

        <section
          className="sp-tarjeta sp-historial"
          aria-labelledby="sp-historial-titulo"
        >
          <div className="sp-seccion-encabezado">
            <h2 id="sp-historial-titulo">
              Historial de avances
            </h2>

            {!pendienteIntegracion && !cargando && !error && (
              <span>
                {ordenados.length}{' '}
                {ordenados.length === 1
                  ? 'avance mostrado'
                  : 'avances mostrados'}
              </span>
            )}
          </div>

          {pendienteIntegracion && (
            <div className="sp-mensaje" role="status">
              <strong>Vista preparada para integración</strong>
              <p>
                El historial todavía no está conectado con
                Laravel. Aquí aparecerán los avances reales
                registrados para este proyecto.
              </p>
            </div>
          )}

          {cargando && (
            <p className="sp-mensaje" role="status">
              Cargando avances del proyecto…
            </p>
          )}

          {!cargando && error && (
            <div
              className="sp-mensaje sp-mensaje-error"
              role="alert"
            >
              <p>{error}</p>

              {onReintentar && (
                <button
                  type="button"
                  className="sp-boton sp-boton-primario"
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
            ordenados.length === 0 && (
              <p className="sp-mensaje" role="status">
                Este proyecto todavía no tiene avances
                registrados.
              </p>
            )}

          {!pendienteIntegracion &&
            !cargando &&
            !error &&
            ordenados.length > 0 && (
              <ol className="sp-linea-tiempo">
                {ordenados.map((avance) => (
                  <li key={avance.id} className="sp-avance">
                    <div className="sp-avance-encabezado">
                      <div>
                        <small>
                          {fechaLegible(avance.created_at)}
                        </small>
                        <h3>{avance.title}</h3>
                      </div>

                      {avance.progress !== null && (
                        <span className="sp-porcentaje">
                          {avance.progress}%
                        </span>
                      )}
                    </div>

                    <p>{avance.description}</p>

                    {avance.author?.name && (
                      <span className="sp-autor">
                        Registrado por {avance.author.name}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
        </section>

        {puedeRegistrar && (
          <section
            className="sp-tarjeta sp-registro"
            aria-labelledby="sp-registro-titulo"
          >
            <h2 id="sp-registro-titulo">
              Registrar nuevo avance
            </h2>

            <p className="sp-descripcion">
              Comparte los resultados y actividades recientes
              del proyecto.
            </p>

            <form
              className="sp-formulario"
              onSubmit={(evento) => void registrar(evento)}
              noValidate
            >
              <div className="sp-campo">
                <label htmlFor="sp-title">
                  Título del avance *
                </label>
                <input
                  id="sp-title"
                  type="text"
                  maxLength={255}
                  value={titulo}
                  onChange={(evento) =>
                    setTitulo(evento.target.value)
                  }
                  placeholder="Ej. Finalización del prototipo"
                  disabled={guardando}
                />
              </div>

              <div className="sp-campo">
                <label htmlFor="sp-description">
                  Descripción del avance *
                </label>
                <textarea
                  id="sp-description"
                  rows={5}
                  value={descripcion}
                  onChange={(evento) =>
                    setDescripcion(evento.target.value)
                  }
                  placeholder="Describe las actividades realizadas, resultados y próximos pasos."
                  disabled={guardando}
                />
              </div>

              <div className="sp-campo sp-campo-progreso">
                <label htmlFor="sp-progress">
                  Porcentaje de progreso
                  <span className="sp-opcional">
                    {' '}(opcional)
                  </span>
                </label>

                <input
                  id="sp-progress"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={progreso}
                  onChange={(evento) =>
                    setProgreso(evento.target.value)
                  }
                  placeholder="0 a 100"
                  disabled={guardando}
                />

                <small>
                  Deja este campo vacío si no deseas actualizar
                  el porcentaje del proyecto.
                </small>
              </div>

              {errorFormulario && (
                <p
                  className="sp-mensaje sp-mensaje-error"
                  role="alert"
                >
                  {errorFormulario}
                </p>
              )}

              {!onRegistrar && (
                <p className="sp-mensaje" role="status">
                  El formulario está preparado para su
                  integración. El registro se habilitará cuando
                  se conecte el servicio de Laravel.
                </p>
              )}

              <div className="sp-acciones">
                <button
                  type="submit"
                  className="sp-boton sp-boton-primario"
                  disabled={guardando || !onRegistrar}
                >
                  {guardando
                    ? 'Registrando avance…'
                    : 'Registrar avance'}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
