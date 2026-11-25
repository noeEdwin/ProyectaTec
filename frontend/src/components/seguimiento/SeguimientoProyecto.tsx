import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { extraerMensajeErrorVinculacion } from '../../api/vinculacionSeguimientoService';

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
    estado?: string;
  };
  avances?: AvanceProyecto[];
  ultimoProgreso?: UltimoProgresoProyecto | null;
  cargando?: boolean;
  error?: string | null;
  puedeRegistrar?: boolean;
  esDueno?: boolean;
  onRegistrar?: (datos: NuevoAvanceProyecto) => Promise<void>;
  onAsignarPorcentaje?: (updateId: number, progress: number) => Promise<void>;
  onCambiarEstado?: (estado: 'completed' | 'closed') => Promise<void>;
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
  esDueno = false,
  onRegistrar,
  onAsignarPorcentaje,
  onCambiarEstado,
  onReintentar,
}: Props) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [progreso, setProgreso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);
  const [errorFormulario, setErrorFormulario] =
    useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [porcentajeItem, setPorcentajeItem] = useState('');
  const [guardandoItem, setGuardandoItem] = useState(false);
  const [errorItem, setErrorItem] = useState<string | null>(null);

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

    if (esDueno && progresoLimpio !== '') {
      if (!/^\d+$/.test(progresoLimpio) || Number(progresoLimpio) > 100) {
        setErrorFormulario(
          'El porcentaje debe ser un número entero entre 0 y 100.',
        );
        return;
      }
      if (progresoActual !== null && Number(progresoLimpio) < progresoActual) {
        setErrorFormulario(
          `El porcentaje no puede retroceder por debajo del avance actual (${progresoActual}%).`,
        );
        return;
      }
    }

    setErrorFormulario(null);
    setGuardando(true);

    try {
      await onRegistrar({
        title: tituloLimpio,
        description: descripcionLimpia,
        progress:
          esDueno && progresoLimpio !== ''
            ? Number(progresoLimpio)
            : null,
      });

      setTitulo('');
      setDescripcion('');
      setProgreso('');
    } catch (err: unknown) {
      setErrorFormulario(
        extraerMensajeErrorVinculacion(
          err,
          'No se pudo registrar el avance. Inténtalo nuevamente.',
        ),
      );
    } finally {
      setGuardando(false);
    }
  }

  const proyectoAbierto = ['open', 'in_progress'].includes(proyecto.estado ?? 'open');

  async function cambiarEstadoProyecto(nuevoEstado: 'completed' | 'closed') {
    if (!esDueno || !onCambiarEstado || cambiandoEstado || !proyectoAbierto) return;
    setErrorEstado(null);
    setCambiandoEstado(true);
    try {
      await onCambiarEstado(nuevoEstado);
    } catch (err: unknown) {
      setErrorEstado(
        extraerMensajeErrorVinculacion(err, 'No se pudo actualizar el estado del proyecto.'),
      );
    } finally {
      setCambiandoEstado(false);
    }
  }

  async function guardarPorcentajeItem(avanceId: number) {
    if (!esDueno || !onAsignarPorcentaje || guardandoItem) return;
    const limpio = porcentajeItem.trim();
    if (!/^\d+$/.test(limpio) || Number(limpio) > 100) {
      setErrorItem('Ingresa un entero entre 0 y 100.');
      return;
    }
    const valor = Number(limpio);
    if (progresoActual !== null && valor < progresoActual) {
      setErrorItem(`No puede retroceder por debajo del avance actual (${progresoActual}%).`);
      return;
    }

    setErrorItem(null);
    setGuardandoItem(true);
    try {
      await onAsignarPorcentaje(avanceId, valor);
      setEditandoId(null);
      setPorcentajeItem('');
    } catch (err: unknown) {
      setErrorItem(
        extraerMensajeErrorVinculacion(err, 'No se pudo asignar el porcentaje.'),
      );
    } finally {
      setGuardandoItem(false);
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
            <p>
              Avance general del proyecto
              {proyecto.estado === 'completed'
                ? ' · Proyecto finalizado'
                : proyecto.estado === 'closed'
                  ? ' · Proyecto cerrado'
                  : ''}
            </p>
            {esDueno && proyectoAbierto && onCambiarEstado && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="sp-boton sp-boton-primario"
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                  disabled={cambiandoEstado}
                  onClick={() => void cambiarEstadoProyecto('completed')}
                >
                  {cambiandoEstado ? 'Actualizando…' : 'Finalizar proyecto'}
                </button>
                <button
                  type="button"
                  className="sp-boton"
                  style={{ padding: '8px 14px', fontSize: '13px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                  disabled={cambiandoEstado}
                  onClick={() => void cambiarEstadoProyecto('closed')}
                >
                  Cerrar proyecto
                </button>
              </div>
            )}
            {errorEstado && (
              <p className="sp-mensaje sp-mensaje-error" role="alert" style={{ marginTop: '8px' }}>
                {errorEstado}
              </p>
            )}
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

                    {esDueno && proyectoAbierto && onAsignarPorcentaje && (
                      <div style={{ marginTop: '10px' }}>
                        {editandoId === avance.id ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="number"
                              min={progresoActual ?? 0}
                              max={100}
                              step={1}
                              value={porcentajeItem}
                              onChange={(e) => setPorcentajeItem(e.target.value)}
                              placeholder={progresoActual !== null ? `${progresoActual}–100` : '0–100'}
                              aria-label={`Asignar porcentaje a ${avance.title}`}
                              style={{ width: '96px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                              disabled={guardandoItem}
                            />
                            <button
                              type="button"
                              className="sp-boton sp-boton-primario"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              disabled={guardandoItem}
                              onClick={() => void guardarPorcentajeItem(avance.id)}
                            >
                              {guardandoItem ? 'Guardando…' : 'Guardar %'}
                            </button>
                            <button
                              type="button"
                              className="sp-boton"
                              style={{ padding: '6px 12px', fontSize: '12px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                              disabled={guardandoItem}
                              onClick={() => {
                                setEditandoId(null);
                                setErrorItem(null);
                              }}
                            >
                              Cancelar
                            </button>
                            {errorItem && (
                              <span className="formato-ayuda invalido" style={{ width: '100%' }}>
                                {errorItem}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="sp-boton"
                            style={{ padding: '5px 12px', fontSize: '12px', background: '#edf5f6', color: '#0f4c5c', border: '1px solid #cbd5e1' }}
                            onClick={() => {
                              setEditandoId(avance.id);
                              setPorcentajeItem(
                                avance.progress !== null
                                  ? String(avance.progress)
                                  : progresoActual !== null
                                    ? String(progresoActual)
                                    : '',
                              );
                              setErrorItem(null);
                            }}
                          >
                            {avance.progress !== null ? 'Actualizar %' : 'Asignar %'}
                          </button>
                        )}
                      </div>
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
              <p className="form-leyenda-obligatorios" style={{ marginBottom: 0 }}>
                Los campos marcados con <span className="campo-obligatorio">*</span> son obligatorios.
              </p>
              <div className="sp-campo">
                <label htmlFor="sp-title">
                  Título del avance<span className="campo-obligatorio" aria-hidden="true">*</span>
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
                  Descripción del avance<span className="campo-obligatorio" aria-hidden="true">*</span>
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

              {esDueno ? (
                <div className="sp-campo sp-campo-progreso">
                  <label htmlFor="sp-progress">
                    Porcentaje de progreso
                    <span className="campo-opcional">(opcional)</span>
                  </label>

                  <input
                    id="sp-progress"
                    type="number"
                    min={progresoActual ?? 0}
                    max={100}
                    step={1}
                    value={progreso}
                    onChange={(evento) =>
                      setProgreso(evento.target.value)
                    }
                    placeholder={progresoActual !== null ? `${progresoActual} a 100` : '0 a 100'}
                    disabled={guardando}
                  />

                  <small>
                    {progresoActual !== null
                      ? `Debe ser un entero entre ${progresoActual}% y 100%. Déjalo vacío para mantener ${progresoActual}%.`
                      : 'Formato: número entero del 0 al 100. Déjalo vacío si no deseas cambiar el porcentaje.'}
                  </small>
                  {progreso.trim() !== '' && (
                    !/^\d+$/.test(progreso.trim()) || Number(progreso.trim()) > 100 ? (
                      <p className="formato-ayuda invalido">
                        Debe ser un número entero entre 0 y 100 (sin decimales ni símbolos).
                      </p>
                    ) : progresoActual !== null && Number(progreso.trim()) < progresoActual ? (
                      <p className="formato-ayuda invalido">
                        No puede retroceder por debajo del avance actual ({progresoActual}%).
                      </p>
                    ) : null
                  )}
                </div>
              ) : (
                <p className="formato-ayuda">
                  Como colaborador puedes registrar actividades; solo el responsable del proyecto ajusta el porcentaje de avance y el cierre.
                </p>
              )}

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