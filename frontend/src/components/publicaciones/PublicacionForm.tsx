import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import {
  LIMITES,
  MODALIDADES,
  TIPOS_PUBLICACION,
  VALORES_INICIALES,
} from '../../types/publicacion';
import type {
  Categoria,
  PublicacionErrors,
  PublicacionFormValues,
  PublicacionPayload,
} from '../../types/publicacion';
import {
  construirPayload,
  validarPublicacion,
} from '../../utils/validacionPublicacion';
import '../../styles/publicaciones.css';

type Props = {
  modo: 'crear' | 'editar';
  categorias: Categoria[];
  cargandoCategorias?: boolean;
  errorCategorias?: string | null;
  valoresIniciales?: Partial<PublicacionFormValues>;
  /** Heber conecta aquí la API (ver api/publicacionesService.ts). Debe lanzar si falla. */
  onSubmit: (payload: PublicacionPayload) => Promise<void>;
  onCancel: () => void;
};

// Orden en que aparecen los campos
const ORDEN_CAMPOS: (keyof PublicacionFormValues)[] = [
  'title',
  'category_id',
  'modality',
  'location',
  'starts_at',
  'ends_at',
  'description',
];

const CAMPOS_API = new Set<string>(ORDEN_CAMPOS);

function enfocar(campo: string) {
  document.getElementById(`pub-${campo}`)?.focus();
}

// Convierte el error de la API en mensajes por campo (formato 422 de Laravel).
function erroresDeApi(err: unknown): PublicacionErrors {
  if (axios.isAxiosError<{ errors?: Record<string, string[]> }>(err)) {
    const status = err.response?.status;

    if (status === 422) {
      const resultado: Record<string, string> = {};
      for (const [campo, mensajes] of Object.entries(err.response?.data?.errors ?? {})) {
        if (CAMPOS_API.has(campo) && mensajes[0]) resultado[campo] = mensajes[0];
      }
      if (Object.keys(resultado).length > 0) return resultado as PublicacionErrors;
      return { general: 'Revisa los datos e inténtalo de nuevo.' };
    }
    if (status === 401) return { general: 'Tu sesión expiró. Inicia sesión nuevamente.' };
    if (status === 403) return { general: 'No tienes permisos para realizar esta acción.' };
  }
  return { general: 'No fue posible guardar la publicación. Inténtalo nuevamente.' };
}

function MensajeError({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="pub-error">
      {texto}
    </p>
  );
}

export default function PublicacionForm({
  modo,
  categorias,
  cargandoCategorias = false,
  errorCategorias = null,
  valoresIniciales,
  onSubmit,
  onCancel,
}: Props) {
  const [valores, setValores] = useState<PublicacionFormValues>(() => ({
    ...VALORES_INICIALES,
    ...valoresIniciales,
  }));
  const [errores, setErrores] = useState<PublicacionErrors>({});
  const [intentado, setIntentado] = useState(false);
  const [vista, setVista] = useState<'formulario' | 'previa'>('formulario');
  const [enviando, setEnviando] = useState(false);

  const previaRef = useRef<HTMLHeadingElement | null>(null);
  const descripcionRef = useRef<HTMLTextAreaElement | null>(null);

  const editando = modo === 'editar';
  const esProyecto = valores.tipo === 'proyecto';

  // La descripción crece con el texto 
  useEffect(() => {
    const el = descripcionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [valores.description, vista]);

  // Al abrir la vista previa, mover el foco al encabezado.
  useEffect(() => {
    if (vista === 'previa') previaRef.current?.focus();
  }, [vista]);

  function cambiar<K extends keyof PublicacionFormValues>(
    campo: K,
    valor: PublicacionFormValues[K],
  ) {
    const siguientes: PublicacionFormValues = { ...valores, [campo]: valor };
    setValores(siguientes);
    if (intentado) setErrores(validarPublicacion(siguientes));
  }

  function irAVistaPrevia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIntentado(true);

    const nuevos = validarPublicacion(valores);
    setErrores(nuevos);

    const primero = ORDEN_CAMPOS.find((campo) => nuevos[campo]);
    if (primero) {
      enfocar(primero);
      return;
    }
    setVista('previa');
  }

  async function confirmar() {
    if (enviando) return;
    setEnviando(true);
    setErrores({});

    try {
      await onSubmit(construirPayload(valores));
    } catch (err: unknown) {
      const deApi = erroresDeApi(err);
      setErrores(deApi);
      setVista('formulario');
      const primero = ORDEN_CAMPOS.find((campo) => deApi[campo]);
      if (primero) requestAnimationFrame(() => enfocar(primero));
    } finally {
      setEnviando(false);
    }
  }

  const categoriaSeleccionada = categorias.find(
    (c) => String(c.id) === valores.category_id,
  );
  const tipoSeleccionado = TIPOS_PUBLICACION.find((t) => t.value === valores.tipo);
  const modalidadSeleccionada = MODALIDADES.find((m) => m.value === valores.modality);

  const sinCategorias = !cargandoCategorias && categorias.length === 0;

  return (
    <div className="pub-page">
      <div className="pub-contenedor">
        <header className="pub-encabezado">
          <p className="pub-eyebrow">
            <span>
              PROYECTATEC / {editando ? 'EDITAR PUBLICACIÓN' : 'NUEVA PUBLICACIÓN'}
            </span>
          </p>
          <h1>{editando ? 'Editar publicación' : 'Nueva publicación'}</h1>
          <p className="pub-subtitulo">
            {editando
              ? 'Actualiza los datos de tu publicación.'
              : 'Comparte una necesidad, iniciativa u oportunidad con el ecosistema.'}
          </p>
        </header>

        <div className="pub-grid">
          {/* Tipo de participación (va primero en el DOM para que sea lo primero que se llena) */}
          <section className="pub-card pub-area-tipo" aria-labelledby="pub-tipo-titulo">
            <h2 id="pub-tipo-titulo">Tipo de participación</h2>
            <p className="pub-texto">
              Elige qué quieres publicar. Los campos del formulario cambian según el tipo.
            </p>

            <div className="pub-tipos" role="radiogroup" aria-labelledby="pub-tipo-titulo">
              {TIPOS_PUBLICACION.map((tipo) => {
                const activa = valores.tipo === tipo.value;
                const bloqueada = editando || vista === 'previa';
                return (
                  <label
                    key={tipo.value}
                    className={`pub-tipo-opcion${activa ? ' activa' : ''}${
                      bloqueada ? ' bloqueada' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      id={`pub-tipo-${tipo.value}`}
                      value={tipo.value}
                      checked={activa}
                      disabled={bloqueada}
                      onChange={() => cambiar('tipo', tipo.value)}
                    />
                    <span>
                      <strong>{tipo.label}</strong>
                      <small>{tipo.descripcion}</small>
                    </span>
                  </label>
                );
              })}
            </div>

            {editando && (
              <p className="pub-nota">El tipo no se puede cambiar al editar.</p>
            )}
          </section>

          {/* Formulario / vista previa */}
          <section className="pub-card pub-area-form" aria-labelledby="pub-form-titulo">
            {vista === 'formulario' ? (
              <>
                <h2 id="pub-form-titulo">
                  {esProyecto ? 'Información de la iniciativa' : 'Información de la necesidad'}
                </h2>

                {errores.general && (
                  <div className="pub-alerta" role="alert">
                    {errores.general}
                  </div>
                )}

                <form className="pub-form" onSubmit={irAVistaPrevia} noValidate>
                  <div className="pub-campos">
                    {/* Título */}
                    <div className="pub-campo">
                      <label htmlFor="pub-title">Título</label>
                      <input
                        id="pub-title"
                        type="text"
                        value={valores.title}
                        maxLength={LIMITES.titulo.max}
                        placeholder="Nombre claro y breve de la iniciativa"
                        onChange={(e) => cambiar('title', e.target.value)}
                        aria-invalid={Boolean(errores.title)}
                        aria-describedby={errores.title ? 'pub-title-error' : undefined}
                      />
                      <MensajeError id="pub-title-error" texto={errores.title} />
                    </div>

                    {/* Sector y modalidad */}
                    <div className={`pub-fila${esProyecto ? '' : ' pub-fila-simple'}`}>
                      <div className="pub-campo">
                        <label htmlFor="pub-category_id">Sector</label>
                        <select
                          id="pub-category_id"
                          value={valores.category_id}
                          className={valores.category_id ? '' : 'pub-vacio'}
                          disabled={cargandoCategorias || sinCategorias}
                          onChange={(e) => cambiar('category_id', e.target.value)}
                          aria-invalid={Boolean(errores.category_id)}
                          aria-describedby={
                            errores.category_id || errorCategorias
                              ? 'pub-category_id-error'
                              : undefined
                          }
                        >
                          <option value="" disabled>
                            {cargandoCategorias
                              ? 'Cargando sectores...'
                              : 'Selecciona el sector de la iniciativa'}
                          </option>
                          {categorias.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <MensajeError
                          id="pub-category_id-error"
                          texto={errores.category_id ?? errorCategorias ?? undefined}
                        />
                      </div>

                      {esProyecto && (
                        <div className="pub-campo">
                          <label htmlFor="pub-modality">
                            Modalidad <span className="pub-opcional">(opcional)</span>
                          </label>
                          <select
                            id="pub-modality"
                            value={valores.modality}
                            className={valores.modality ? '' : 'pub-vacio'}
                            onChange={(e) => cambiar('modality', e.target.value)}
                            aria-invalid={Boolean(errores.modality)}
                            aria-describedby={errores.modality ? 'pub-modality-error' : undefined}
                          >
                            <option value="">Presencial, híbrida o remota</option>
                            {MODALIDADES.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          <MensajeError id="pub-modality-error" texto={errores.modality} />
                        </div>
                      )}
                    </div>

                    {/* Ubicación */}
                    <div className="pub-campo">
                      <label htmlFor="pub-location">
                        Ubicación <span className="pub-opcional">(opcional)</span>
                      </label>
                      <input
                        id="pub-location"
                        type="text"
                        value={valores.location}
                        maxLength={LIMITES.ubicacion.max}
                        placeholder="Municipio o región de Oaxaca"
                        onChange={(e) => cambiar('location', e.target.value)}
                        aria-invalid={Boolean(errores.location)}
                        aria-describedby={errores.location ? 'pub-location-error' : undefined}
                      />
                      <MensajeError id="pub-location-error" texto={errores.location} />
                    </div>

                    {/* Fechas (solo proyectos) */}
                    {esProyecto && (
                      <div className="pub-fila">
                        <div className="pub-campo">
                          <label htmlFor="pub-starts_at">
                            Fecha de inicio <span className="pub-opcional">(opcional)</span>
                          </label>
                          <input
                            id="pub-starts_at"
                            type="date"
                            value={valores.starts_at}
                            className={valores.starts_at ? '' : 'pub-vacio'}
                            onChange={(e) => cambiar('starts_at', e.target.value)}
                            aria-invalid={Boolean(errores.starts_at)}
                            aria-describedby={errores.starts_at ? 'pub-starts_at-error' : undefined}
                          />
                          <MensajeError id="pub-starts_at-error" texto={errores.starts_at} />
                        </div>

                        <div className="pub-campo">
                          <label htmlFor="pub-ends_at">
                            Fecha de fin <span className="pub-opcional">(opcional)</span>
                          </label>
                          <input
                            id="pub-ends_at"
                            type="date"
                            value={valores.ends_at}
                            min={valores.starts_at || undefined}
                            className={valores.ends_at ? '' : 'pub-vacio'}
                            onChange={(e) => cambiar('ends_at', e.target.value)}
                            aria-invalid={Boolean(errores.ends_at)}
                            aria-describedby={errores.ends_at ? 'pub-ends_at-error' : undefined}
                          />
                          <MensajeError id="pub-ends_at-error" texto={errores.ends_at} />
                        </div>
                      </div>
                    )}

                    {/* Descripción */}
                    <div className="pub-campo">
                      <label htmlFor="pub-description">Descripción</label>
                      <textarea
                        id="pub-description"
                        ref={descripcionRef}
                        rows={1}
                        value={valores.description}
                        maxLength={LIMITES.descripcion.max}
                        placeholder="¿Qué necesitas u oportunidad deseas compartir?"
                        onChange={(e) => cambiar('description', e.target.value)}
                        aria-invalid={Boolean(errores.description)}
                        aria-describedby={
                          errores.description ? 'pub-description-error' : 'pub-description-cuenta'
                        }
                      />
                      <div className="pub-pie-campo">
                        <MensajeError id="pub-description-error" texto={errores.description} />
                        <span id="pub-description-cuenta" className="pub-cuenta">
                          {valores.description.length}/{LIMITES.descripcion.max}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pub-acciones">
                    <button type="submit" className="pub-boton pub-boton-primario">
                      Vista previa
                    </button>
                    <button
                      type="button"
                      className="pub-boton pub-boton-secundario"
                      onClick={onCancel}
                    >
                      Volver
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="pub-previa">
                <h2 id="pub-form-titulo" ref={previaRef} tabIndex={-1}>
                  Vista previa
                </h2>
                <p className="pub-texto">
                  Revisa cómo quedará tu publicación antes de {editando ? 'guardar los cambios' : 'publicarla'}.
                </p>

                <dl className="pub-resumen">
                  <div>
                    <dt>Tipo</dt>
                    <dd>{tipoSeleccionado?.label}</dd>
                  </div>
                  <div>
                    <dt>Título</dt>
                    <dd>{valores.title.trim()}</dd>
                  </div>
                  <div>
                    <dt>Sector</dt>
                    <dd>{categoriaSeleccionada?.name ?? '—'}</dd>
                  </div>
                  {esProyecto && (
                    <div>
                      <dt>Modalidad</dt>
                      <dd>{modalidadSeleccionada?.label ?? 'No indicada'}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Ubicación</dt>
                    <dd>{valores.location.trim() || 'No indicada'}</dd>
                  </div>
                  {esProyecto && (
                    <div>
                      <dt>Fechas</dt>
                      <dd>
                        {valores.starts_at || valores.ends_at
                          ? `${valores.starts_at || '—'} al ${valores.ends_at || '—'}`
                          : 'No indicadas'}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Descripción</dt>
                    <dd className="pub-resumen-texto">{valores.description.trim()}</dd>
                  </div>
                </dl>

                <div className="pub-acciones">
                  <button
                    type="button"
                    className="pub-boton pub-boton-primario"
                    onClick={confirmar}
                    disabled={enviando}
                  >
                    {enviando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Publicar'}
                  </button>
                  <button
                    type="button"
                    className="pub-boton pub-boton-secundario"
                    onClick={() => setVista('formulario')}
                    disabled={enviando}
                  >
                    Seguir editando
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Antes de publicar */}
          <section className="pub-card pub-area-antes" aria-labelledby="pub-antes-titulo">
            <h2 id="pub-antes-titulo">Antes de publicar</h2>
            <p className="pub-texto">
              Tu publicación podrá ser consultada por estudiantes, empresas, instituciones y
              organizaciones sociales.
            </p>
            <p className="pub-enlace-texto">Puedes revisar los datos antes de publicarla.</p>
          </section>
        </div>

        <footer className="pub-footer">
          <span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span>
          <span>Ayuda y privacidad</span>
        </footer>
      </div>
    </div>
  );
}