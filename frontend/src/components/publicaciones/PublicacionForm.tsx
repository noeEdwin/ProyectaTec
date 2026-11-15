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
  PublicacionMediaItem,
  PublicacionMediaSelection,
  PublicacionPayload,
  RequerimientoItem,
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
  /** Conexión con la API de publicaciones (ver api/publicacionesService.ts). */
  onSubmit: (payload: PublicacionPayload, media?: PublicacionMediaSelection) => Promise<void>;
  onCancel: () => void;
};

const TIPOS_IMAGEN_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validarArchivoImagen(file: File): string | null {
  if (!TIPOS_IMAGEN_PERMITIDOS.has(file.type)) {
    return `El archivo "${file.name}" debe ser JPG, PNG o WEBP.`;
  }
  if (file.size > LIMITES.maxImagenBytes) {
    return `El archivo "${file.name}" supera el límite de 3 MB.`;
  }
  return null;
}

// Orden en que aparecen los campos
const ORDEN_CAMPOS: (keyof PublicacionFormValues)[] = [
  'title',
  'category_id',
  'modality',
  'location',
  'starts_at',
  'ends_at',
  'description',
  'requirements',
];

const CAMPOS_API = new Set<string>(ORDEN_CAMPOS);

function enfocar(campo: string) {
  document.getElementById(`pub-${campo}`)?.focus();
}

// Convierte el error de la API en mensajes por campo (formato 422 de Laravel).
function erroresDeApi(err: unknown): PublicacionErrors {
  if (axios.isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(err)) {
    const status = err.response?.status;
    const apiMessage = err.response?.data?.message;

    if (status === 422) {
      const resultado: Record<string, string> = {};
      for (const [campo, mensajes] of Object.entries(err.response?.data?.errors ?? {})) {
        if (CAMPOS_API.has(campo) && mensajes[0]) resultado[campo] = mensajes[0];
      }
      if (Object.keys(resultado).length > 0) return resultado as PublicacionErrors;
      return { general: 'Revisa los datos e inténtalo de nuevo.' };
    }
    if (status === 401) return { general: 'Tu sesión expiró. Inicia sesión nuevamente.' };
    if (status === 403) {
      const mensajeEspanol =
        apiMessage && apiMessage !== 'This action is unauthorized.'
          ? apiMessage
          : 'No tienes permisos para publicar o modificar esta iniciativa. Si perteneces a una organización, verifica que ya esté aprobada.';
      return { general: mensajeEspanol };
    }
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
  categorias = [],
  cargandoCategorias = false,
  errorCategorias = null,
  valoresIniciales,
  onSubmit,
  onCancel,
}: Props) {
  const [valores, setValores] = useState<PublicacionFormValues>(() => ({
    ...VALORES_INICIALES,
    ...valoresIniciales,
    requirements: valoresIniciales?.requirements ?? [],
    existingCoverUrl: valoresIniciales?.existingCoverUrl ?? null,
    existingGallery: valoresIniciales?.existingGallery ?? [],
  }));
  const [errores, setErrores] = useState<PublicacionErrors>({});
  const [intentado, setIntentado] = useState(false);
  const [vista, setVista] = useState<'formulario' | 'previa'>('formulario');
  const [enviando, setEnviando] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [keptGallery, setKeptGallery] = useState<PublicacionMediaItem[]>(
    () => valoresIniciales?.existingGallery ?? [],
  );
  const [newGalleryFiles, setNewGalleryFiles] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [errorMedia, setErrorMedia] = useState<string | null>(null);
  const createdUrlsRef = useRef<string[]>([]);

  const previaRef = useRef<HTMLHeadingElement | null>(null);
  const descripcionRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const urls = createdUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const editando = modo === 'editar';
  const esProyecto = valores.tipo === 'proyecto';

  // Garantizar que categorias sea siempre un array válido
  const listaCategorias = Array.isArray(categorias) ? categorias : [];

  // Ajusta la altura de la descripción dinámicamente
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

  function agregarRequerimiento() {
    if (valores.requirements.length >= LIMITES.maxRequerimientos) return;
    const nuevo: RequerimientoItem = {
      title: '',
      description: '',
      required_profile: '',
      openings: 1,
    };
    cambiar('requirements', [...valores.requirements, nuevo]);
  }

  function actualizarRequerimiento(index: number, patch: Partial<RequerimientoItem>) {
    const siguientes = valores.requirements.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item,
    );
    cambiar('requirements', siguientes);
  }

  function quitarRequerimiento(index: number) {
    const siguientes = valores.requirements.filter((_, idx) => idx !== index);
    cambiar('requirements', siguientes);
  }

  function seleccionarPortada(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const err = validarArchivoImagen(file);
    if (err) {
      setErrorMedia(err);
      return;
    }
    setErrorMedia(null);
    const preview = URL.createObjectURL(file);
    createdUrlsRef.current.push(preview);
    setCoverFile(file);
    setCoverPreviewUrl(preview);
    setRemoveCover(false);
  }

  function quitarPortada() {
    setCoverFile(null);
    setCoverPreviewUrl(null);
    setRemoveCover(true);
    setErrorMedia(null);
  }

  function agregarGaleria(files: FileList | null) {
    if (!files || files.length === 0) return;
    const disponibles = LIMITES.maxGaleria - (keptGallery.length + newGalleryFiles.length);
    if (disponibles <= 0) {
      setErrorMedia(`La galería admite un máximo de ${LIMITES.maxGaleria} imágenes.`);
      return;
    }

    const seleccion = Array.from(files);
    if (seleccion.length > disponibles) {
      setErrorMedia(`Solo puedes agregar ${disponibles} imagen(es) más (máximo ${LIMITES.maxGaleria}).`);
    } else {
      setErrorMedia(null);
    }

    const validas: Array<{ file: File; previewUrl: string }> = [];
    for (const file of seleccion.slice(0, disponibles)) {
      const err = validarArchivoImagen(file);
      if (err) {
        setErrorMedia(err);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      createdUrlsRef.current.push(previewUrl);
      validas.push({ file, previewUrl });
    }
    if (validas.length > 0) {
      setNewGalleryFiles((prev) => [...prev, ...validas]);
    }
  }

  function quitarImagenExistente(path: string) {
    setKeptGallery((prev) => prev.filter((item) => item.path !== path));
    setErrorMedia(null);
  }

  function quitarNuevaImagen(index: number) {
    setNewGalleryFiles((prev) => prev.filter((_, idx) => idx !== index));
    setErrorMedia(null);
  }

  function irAVistaPrevia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIntentado(true);

    const nuevos = validarPublicacion(valores);
    setErrores(nuevos);

    const primero = ORDEN_CAMPOS.find((campo) => nuevos[campo]);
    if (Object.keys(nuevos).length > 0 || errorMedia) {
      if (primero) enfocar(primero);
      return;
    }
    setVista('previa');
  }

  async function confirmar() {
    if (enviando) return;
    setEnviando(true);
    setErrores({});

    const mediaSelection: PublicacionMediaSelection = {
      coverFile,
      removeCover,
      keepGallery: keptGallery.map((item) => item.path),
      galleryFiles: newGalleryFiles.map((item) => item.file),
    };

    try {
      await onSubmit(construirPayload(valores), mediaSelection);
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

  const portadaActivaUrl = coverFile
    ? coverPreviewUrl
    : removeCover
      ? null
      : valores.existingCoverUrl;
  const galeriaPreviewUrls = [
    ...keptGallery.map((item) => item.url),
    ...newGalleryFiles.map((item) => item.previewUrl),
  ];
  const totalGaleria = galeriaPreviewUrls.length;

  const categoriaSeleccionada = listaCategorias.find(
    (c) => String(c.id) === valores.category_id,
  );
  const tipoSeleccionado = TIPOS_PUBLICACION.find((t) => t.value === valores.tipo);
  const modalidadSeleccionada = MODALIDADES.find((m) => m.value === valores.modality);

  const sinCategorias = !cargandoCategorias && listaCategorias.length === 0;

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
          {/* Tipo de participación */}
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

          {/* Formulario / Vista Previa */}
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

                    {/* Categoría y modalidad */}
                    <div className={`pub-fila${esProyecto ? '' : ' pub-fila-simple'}`}>
                      <div className="pub-campo">
                        <label htmlFor="pub-category_id">Categoría</label>
                        <select
                          id="pub-category_id"
                          value={valores.category_id}
                          className={valores.category_id ? '' : 'pub-vacio'}
                          disabled={cargandoCategorias || sinCategorias}  // <--- AQUÍ ESTÁ
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
                              ? 'Cargando categorías...'
                              : 'Selecciona la categoría de la iniciativa'}
                          </option>
                          {listaCategorias.map((c) => (
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

                    {/* Imagen de portada y galería */}
                    <div className="pub-seccion-extra">
                      <div className="pub-extra-header">
                        <div>
                          <h3>Imágenes de la publicación</h3>
                          <p>
                            Agrega una foto principal (portada o perfil del proyecto) y hasta {LIMITES.maxGaleria}{' '}
                            imágenes de galería (JPG, PNG o WEBP, máx. 3 MB c/u).
                          </p>
                        </div>
                      </div>

                      <div className="pub-media-grid">
                        <div className="pub-media-bloque">
                          <label htmlFor="pub-cover-input">
                            Foto de portada / perfil <span className="pub-opcional">(opcional)</span>
                          </label>
                          <div className="pub-portada-box">
                            {portadaActivaUrl ? (
                              <div className="pub-portada-preview">
                                <img src={portadaActivaUrl} alt="Vista previa de portada" />
                                <button
                                  type="button"
                                  className="pub-media-quitar"
                                  onClick={quitarPortada}
                                  aria-label="Quitar foto de portada"
                                >
                                  Quitar
                                </button>
                              </div>
                            ) : (
                              <div className="pub-portada-vacia">Sin foto de portada</div>
                            )}
                            <input
                              id="pub-cover-input"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                seleccionarPortada(e.target.files);
                                e.target.value = '';
                              }}
                            />
                          </div>
                        </div>

                        <div className="pub-media-bloque">
                          <label htmlFor="pub-gallery-input">
                            Galería ({totalGaleria}/{LIMITES.maxGaleria}){' '}
                            <span className="pub-opcional">(opcional)</span>
                          </label>
                          <input
                            id="pub-gallery-input"
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            disabled={totalGaleria >= LIMITES.maxGaleria}
                            onChange={(e) => {
                              agregarGaleria(e.target.files);
                              e.target.value = '';
                            }}
                          />
                          {totalGaleria > 0 && (
                            <div className="pub-galeria-grid">
                              {keptGallery.map((item) => (
                                <div className="pub-galeria-item" key={item.path}>
                                  <img src={item.url} alt="Imagen guardada en galería" />
                                  <button
                                    type="button"
                                    onClick={() => quitarImagenExistente(item.path)}
                                    aria-label="Eliminar imagen de galería"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              {newGalleryFiles.map((item, idx) => (
                                <div className="pub-galeria-item" key={`${item.file.name}-${idx}`}>
                                  <img src={item.previewUrl} alt={`Nueva imagen ${idx + 1}`} />
                                  <button
                                    type="button"
                                    onClick={() => quitarNuevaImagen(idx)}
                                    aria-label={`Eliminar imagen ${item.file.name}`}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {errorMedia && (
                        <p className="pub-error" role="alert">
                          {errorMedia}
                        </p>
                      )}
                    </div>

                    {/* Múltiples requerimientos / vacantes */}
                    <div className="pub-seccion-extra" id="pub-requirements" tabIndex={-1}>
                      <div className="pub-extra-header">
                        <div>
                          <h3>
                            Requerimientos y perfiles buscados{' '}
                            <span className="pub-opcional">(opcional, máx. {LIMITES.maxRequerimientos})</span>
                          </h3>
                          <p>
                            Detalla los distintos apoyos, vacantes o perfiles que necesitas para esta{' '}
                            {esProyecto ? 'iniciativa' : 'necesidad comunitaria'}.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="pub-boton pub-boton-secundario pub-boton-compacto"
                          onClick={agregarRequerimiento}
                          disabled={valores.requirements.length >= LIMITES.maxRequerimientos}
                        >
                          + Agregar requerimiento
                        </button>
                      </div>

                      {valores.requirements.length === 0 ? (
                        <p className="pub-texto">
                          Aún no agregas requerimientos específicos. Puedes sumar uno o varios perfiles con el botón superior.
                        </p>
                      ) : (
                        <div className="pub-reqs-lista">
                          {valores.requirements.map((req, index) => (
                            <div className="pub-req-item" key={req.id ?? `req-${index}`}>
                              <div className="pub-req-top">
                                <strong>Requerimiento #{index + 1}</strong>
                                <button
                                  type="button"
                                  className="pub-req-quitar"
                                  onClick={() => quitarRequerimiento(index)}
                                >
                                  Eliminar
                                </button>
                              </div>
                              <div className="pub-fila">
                                <div className="pub-campo">
                                  <label htmlFor={`pub-req-title-${index}`}>Título / rol buscado</label>
                                  <input
                                    id={`pub-req-title-${index}`}
                                    type="text"
                                    maxLength={LIMITES.requerimientoTitulo.max}
                                    placeholder="Ej. Desarrollador web o brigadista ambiental"
                                    value={req.title}
                                    onChange={(e) =>
                                      actualizarRequerimiento(index, { title: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="pub-campo">
                                  <label htmlFor={`pub-req-openings-${index}`}>Vacantes</label>
                                  <input
                                    id={`pub-req-openings-${index}`}
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={req.openings}
                                    onChange={(e) =>
                                      actualizarRequerimiento(index, {
                                        openings: Math.max(1, Number(e.target.value) || 1),
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="pub-fila">
                                <div className="pub-campo">
                                  <label htmlFor={`pub-req-profile-${index}`}>
                                    Perfil o carrera deseada <span className="pub-opcional">(opcional)</span>
                                  </label>
                                  <input
                                    id={`pub-req-profile-${index}`}
                                    type="text"
                                    maxLength={255}
                                    placeholder="Ej. Ing. en Sistemas, Arquitectura, Voluntariado"
                                    value={req.required_profile}
                                    onChange={(e) =>
                                      actualizarRequerimiento(index, { required_profile: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="pub-campo">
                                  <label htmlFor={`pub-req-desc-${index}`}>
                                    Actividades o detalle <span className="pub-opcional">(opcional)</span>
                                  </label>
                                  <input
                                    id={`pub-req-desc-${index}`}
                                    type="text"
                                    maxLength={1000}
                                    placeholder="Breve descripción de lo que realizará"
                                    value={req.description}
                                    onChange={(e) =>
                                      actualizarRequerimiento(index, { description: e.target.value })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <MensajeError id="pub-requirements-error" texto={errores.requirements} />
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
                    <dt>Categoría</dt>
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
                  {(portadaActivaUrl || galeriaPreviewUrls.length > 0) && (
                    <div>
                      <dt>Imágenes</dt>
                      <dd>
                        {portadaActivaUrl && (
                          <div className="pub-previa-portada">
                            <img src={portadaActivaUrl} alt="Portada de la publicación" />
                          </div>
                        )}
                        {galeriaPreviewUrls.length > 0 && (
                          <div className="pub-galeria-grid" style={{ marginTop: 8 }}>
                            {galeriaPreviewUrls.map((url, idx) => (
                              <div className="pub-galeria-item" key={`prev-gal-${idx}`}>
                                <img src={url} alt={`Galería ${idx + 1}`} />
                              </div>
                            ))}
                          </div>
                        )}
                      </dd>
                    </div>
                  )}
                  {valores.requirements.length > 0 && (
                    <div>
                      <dt>Requerimientos ({valores.requirements.length})</dt>
                      <dd>
                        <ul className="pub-previa-reqs">
                          {valores.requirements.map((req, idx) => (
                            <li key={`prev-req-${idx}`}>
                              <strong>{req.title.trim()}</strong> ({req.openings}{' '}
                              {req.openings === 1 ? 'vacante' : 'vacantes'})
                              {req.required_profile.trim() ? ` · Perfil: ${req.required_profile.trim()}` : ''}
                              {req.description.trim() ? ` — ${req.description.trim()}` : ''}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
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