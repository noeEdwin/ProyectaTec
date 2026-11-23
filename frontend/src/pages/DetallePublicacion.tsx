import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  listarMisPublicaciones,
  obtenerDetallePublicacion,
  reportarPublicacion,
  type RequerimientoPublicacion,
} from '../api/publicacionesService';
import {
  enviarSolicitudVinculacion,
  extraerMensajeErrorVinculacion,
  listarMisSolicitudesEnviadas,
} from '../api/vinculacionSeguimientoService';
import { useAuth } from '../context/auth-context';
import { getMyProfile } from '../api/profileService';
import SolicitarVinculacionModal from '../components/vinculacion/SolicitarVinculacionModal';
import type {
  DatosSolicitudVinculacion,
  PerfilSolicitanteResumen,
  SolicitudEnviada,
} from '../types/vinculacion';
import '../styles/catalogoComponentes.css';

interface DetalleData {
  id: number;
  titulo: string;
  organizacion: string;
  organizacionId: number | null;
  createdBy: number | null;
  status: string;
  categoriaId: number | null;
  categoria: string;
  ubicacion: string;
  modalidad: string;
  descripcion: string;
  tipo: 'project' | 'community_need';
  coverImageUrl: string | null;
  galleryUrls: string[];
  requirements: RequerimientoPublicacion[];
}

type MotivoReporte = 'inappropriate' | 'spam' | 'misinformation' | 'other';

const MODALIDADES: Record<string, string> = {
  presencial: 'Presencial',
  hibrida: 'Híbrida',
  remota: 'Remota',
};

const MOTIVOS_REPORTE: Array<{ value: MotivoReporte; label: string }> = [
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'misinformation', label: 'Información engañosa' },
  { value: 'other', label: 'Otro motivo' },
];

export default function DetallePublicacion() {
  const { tipo, id } = useParams<{ tipo: string; id: string }>();
  const { user } = useAuth();

  const [publicacion, setPublicacion] = useState<DetalleData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarSolicitud, setMostrarSolicitud] = useState(false);
  const [solicitudExistente, setSolicitudExistente] = useState<SolicitudEnviada | null>(null);
  const [esResponsableProyecto, setEsResponsableProyecto] = useState(false);
  const [verificandoSolicitud, setVerificandoSolicitud] = useState(false);
  const [confirmacionSolicitud, setConfirmacionSolicitud] = useState<string | null>(null);

  const [cargandoPerfilSolicitud, setCargandoPerfilSolicitud] =
    useState(false);

  const [errorPerfilSolicitud, setErrorPerfilSolicitud] =
    useState<string | null>(null);

  const [perfilSolicitud, setPerfilSolicitud] =
    useState<PerfilSolicitanteResumen | null>(null);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

  const [mostrandoReporte, setMostrandoReporte] = useState(false);
  const [motivoReporte, setMotivoReporte] = useState<MotivoReporte>('inappropriate');
  const [detallesReporte, setDetallesReporte] = useState('');
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [estadoReporte, setEstadoReporte] = useState<{
    tipo: 'ok' | 'error';
    texto: string;
  } | null>(null);

  useEffect(() => {
    async function cargarDetalle() {
      setCargando(true);
      setError(null);
      try {
        if (!id || !Number.isInteger(Number(id)) || Number(id) < 1) {
          throw new Error('La dirección de la publicación no es válida.');
        }
        if (tipo !== 'project' && tipo !== 'proyecto' && tipo !== 'community_need' && tipo !== 'necesidad') {
          throw new Error('El tipo de publicación no es válido.');
        }
        const esProyecto = tipo === 'project' || tipo === 'proyecto';
        const item = await obtenerDetallePublicacion(tipo, Number(id));
        const requirements = esProyecto ? (item.needs ?? []) : (item.requirements ?? []);

        setPublicacion({
          id: item.id,
          titulo: item.title ?? 'Publicación sin título',
          organizacion: item.organization?.name || (esProyecto ? 'Iniciativa ProyectaTec' : 'Comunidad de Oaxaca'),
          organizacionId: item.organization?.id ?? null,
          createdBy:
          typeof (item as { created_by?: unknown }).created_by === 'number'
            ? ((item as { created_by: number }).created_by)
            : null,
          status: item.status ?? 'open',
          categoriaId: item.category_id ?? item.category?.id ?? null,
          categoria: item.category?.name || 'Sin categoría',
          ubicacion: item.location || 'Oaxaca',
          modalidad: item.modality ? (MODALIDADES[item.modality] ?? item.modality) : '',
          descripcion: item.description || 'Sin descripción detallada.',
          tipo: esProyecto ? 'project' : 'community_need',
          coverImageUrl: item.cover_image_url ?? null,
          galleryUrls: Array.isArray(item.gallery_urls) ? item.gallery_urls : [],
          requirements: Array.isArray(requirements) ? requirements : [],
        });
      } catch (err) {
        if (err instanceof Error && !axios.isAxiosError(err)) {
          setError(err.message);
        } else if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('No se encontró la publicación solicitada.');
        } else if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError('No tienes permiso para consultar esta publicación.');
        } else {
          setError('No se pudo cargar la publicación. Revisa tu conexión e inténtalo de nuevo.');
        }
      } finally {
        setCargando(false);
      }
    }

    if (id) {
      void cargarDetalle();
    }
  }, [id, tipo]);

  useEffect(() => {
    let activo = true;

    async function consultarSolicitudPrevia() {
      if (!user || !publicacion || publicacion.tipo !== 'project') {
        setSolicitudExistente(null);
        setEsResponsableProyecto(false);
        setVerificandoSolicitud(false);
        return;
      }

      setVerificandoSolicitud(true);
      try {
        const [propias, misPubs] = await Promise.all([
          listarMisSolicitudesEnviadas().catch(() => []),
          listarMisPublicaciones().catch(() => []),
        ]);
        if (!activo) return;
        const previa = propias.find(
          (s) =>
            s.project_id === publicacion.id &&
            (s.status === 'pending' || s.status === 'accepted'),
        );
        setSolicitudExistente(previa ?? null);
        setEsResponsableProyecto(
          misPubs.some((p) => p.type === 'proyecto' && p.id === publicacion.id),
        );
      } catch {
        if (activo) {
          setSolicitudExistente(null);
          setEsResponsableProyecto(false);
        }
      } finally {
        if (activo) setVerificandoSolicitud(false);
      }
    }

    void consultarSolicitudPrevia();

    return () => {
      activo = false;
    };
  }, [user, publicacion]);

  async function enviarReporte(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!publicacion || enviandoReporte) return;

    const detalles = detallesReporte.trim();
    if (motivoReporte === 'other' && !detalles) {
      setEstadoReporte({
        tipo: 'error',
        texto: 'Describe brevemente el motivo cuando eliges "Otro motivo".',
      });
      return;
    }

    setEnviandoReporte(true);
    setEstadoReporte(null);

    try {
      await reportarPublicacion({
        tipo: publicacion.tipo,
        id: publicacion.id,
        reason: motivoReporte,
        details: detalles || undefined,
      });
      setMostrandoReporte(false);
      setDetallesReporte('');
      setEstadoReporte({
        tipo: 'ok',
        texto: 'Reporte enviado. El equipo de moderación lo revisará.',
      });
    } catch (err) {
      let texto = 'No se pudo enviar el reporte. Inténtalo de nuevo.';
      if (axios.isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(err)) {
        const primerError = err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat()[0]
          : undefined;
        texto = primerError || err.response?.data?.message || texto;
      }
      setEstadoReporte({ tipo: 'error', texto });
    } finally {
      setEnviandoReporte(false);
    }
  }

  async function abrirFormularioSolicitud() {
    if (
      !user ||
      !publicacion ||
      publicacion.tipo !== 'project' ||
      cargandoPerfilSolicitud
    ) {
      return;
    }

    setCargandoPerfilSolicitud(true);
    setErrorPerfilSolicitud(null);

    try {
      const perfil = await getMyProfile();

      setPerfilSolicitud({
        nombre: perfil.display_name?.trim() || user.name,
        descripcion: perfil.description || null,
        institucion:
          perfil.institution || perfil.organization_name || null,
        area:
          perfil.field_of_study ||
          perfil.organization_area ||
          null,
        ubicacion: perfil.location || null,
      });

      setMostrarSolicitud(true);
    } catch (err: unknown) {
      setErrorPerfilSolicitud(
        extraerMensajeErrorVinculacion(
          err,
          'No se pudo cargar la información de tu perfil. Comprueba la conexión e inténtalo nuevamente.',
        ),
      );
    } finally {
      setCargandoPerfilSolicitud(false);
    }
  }

  async function manejarEnvioSolicitud(datos: DatosSolicitudVinculacion) {
    if (!publicacion) return;
    const creada = await enviarSolicitudVinculacion(publicacion.id, datos);
    setSolicitudExistente(creada);
    setConfirmacionSolicitud(
      'Tu solicitud de vinculación fue enviada correctamente.',
    );
  }

  if (cargando) {
    return (
      <main className="dp-page">
        <div className="dp-contenido"><p className="dp-estado" role="status">Cargando detalles de la publicación…</p></div>
      </main>
    );
  }

  if (error || !publicacion) {
    return (
      <main className="dp-page">
        <div className="dp-contenido">
          <p className="dp-error" role="alert">{error || 'Publicación no encontrada.'}</p>
          <Link className="ic-enlace" to="/iniciativas">← Volver a iniciativas</Link>
        </div>
      </main>
    );
  }

  const esProyecto = publicacion.tipo === 'project';
  const etiquetaTipo = esProyecto ? 'Proyecto' : 'Necesidad comunitaria';
  const claseTipo = esProyecto ? 'ic-tipo-proyecto' : 'ic-tipo-necesidad';
  const esCreador = Boolean(user && publicacion.createdBy === user.id);
  const proyectoAbierto = ['open', 'in_progress'].includes(publicacion.status);

  return (
    <main className="dp-page">
      <div className="dp-contenido">
        <span className="dp-eyebrow">PROYECTATEC / {esProyecto ? 'PROYECTO' : 'NECESIDAD COMUNITARIA'}</span>
        <h1>{publicacion.titulo}</h1>
        <div className="dp-cabecera-tipo">
          <span className={`ic-tipo ${claseTipo}`}>{etiquetaTipo}</span>
        </div>
        <p className="dp-subtitulo">
          {publicacion.organizacionId ? (
            <Link to={`/organizaciones/${publicacion.organizacionId}`} className="ic-org-enlace">
              {publicacion.organizacion}
            </Link>
          ) : (
            publicacion.organizacion
          )}{' '}
          · {publicacion.categoria} · {publicacion.ubicacion}
        </p>

        <div className="dp-grid">
          <section className="dp-tarjeta" aria-label="Información de la publicación">
            {publicacion.coverImageUrl && (
              <img
                src={publicacion.coverImageUrl}
                alt={`Portada de ${publicacion.titulo}`}
                className="dp-portada"
              />
            )}
            <h2>{esProyecto ? 'Sobre el proyecto' : 'Sobre la necesidad'}</h2>
            <p>{publicacion.descripcion}</p>

            {publicacion.requirements.length > 0 && (
              <div className="dp-bloque">
                <h3>Requerimientos / vacantes ({publicacion.requirements.length})</h3>
                <ul className="dp-reqs">
                  {publicacion.requirements.map((req, idx) => (
                    <li key={req.id ?? `req-${idx}`} className="dp-req-card">
                      <div className="dp-req-top">
                        <strong>{req.title}</strong>
                        <span>
                          {req.openings} {req.openings === 1 ? 'vacante' : 'vacantes'}
                        </span>
                      </div>
                      {req.required_profile && (
                        <small>Perfil sugerido: {req.required_profile}</small>
                      )}
                      {req.description && <p>{req.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {publicacion.galleryUrls.length > 0 && (
              <div className="dp-bloque">
                <h3>Galería de imágenes ({publicacion.galleryUrls.length})</h3>
                <div className="dp-galeria">
                  {publicacion.galleryUrls.map((url, idx) => (
                    <button
                      type="button"
                      key={`${url}-${idx}`}
                      className="dp-galeria-btn"
                      onClick={() => setImagenAmpliada(url)}
                      aria-label={`Ampliar imagen ${idx + 1} de ${publicacion.titulo}`}
                    >
                      <img src={url} alt={`${publicacion.titulo} - imagen ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="dp-bloque">
              <h3>Información general</h3>
              <dl className="dp-datos">
                <div><dt>Categoría</dt><dd>{publicacion.categoria}</dd></div>
                <div><dt>Ubicación</dt><dd>{publicacion.ubicacion}</dd></div>
                {publicacion.modalidad && <div><dt>Modalidad</dt><dd>{publicacion.modalidad}</dd></div>}
                {publicacion.organizacionId && (
                  <div>
                    <dt>Organización</dt>
                    <dd>
                      <Link to={`/organizaciones/${publicacion.organizacionId}`} className="ic-org-enlace">
                        {publicacion.organizacion} →
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="dp-bloque">
              <h3>Colaboración abierta</h3>
              <p>Los alcances, requisitos y condiciones se confirman con la entidad responsable de la publicación.</p>
            </div>

            {esProyecto && (
              <div className="dp-bloque">
                <h3>Seguimiento del proyecto</h3>
                <p>
                  Consulta el progreso y las actividades registradas
                  durante el desarrollo de esta iniciativa.
                </p>

                <Link
                  className="ic-enlace dp-seguimiento-enlace"
                  to={`/iniciativas/proyecto/${publicacion.id}/seguimiento`}
                >
                  Consultar avances →
                </Link>
              </div>
            )}

          </section>

          <aside className="dp-tarjeta dp-lateral" aria-label="Participar">
            <h2>{esProyecto ? '¿Te interesa participar?' : '¿Puedes colaborar?'}</h2>
            <p>
              {esProyecto
                ? 'Consulta los detalles y envía una solicitud de vinculación para establecer contacto.'
                : 'Si puedes apoyar esta necesidad, envía una solicitud de vinculación para ponerte en contacto.'}
            </p>
            {esProyecto ? (
              user ? (
                (esCreador || esResponsableProyecto) ? (
                  <p className="dp-aviso" role="status">
                    Eres responsable de este proyecto. Puedes gestionar sus solicitudes en{' '}
                    <Link className="ic-enlace" to={`/mis-publicaciones/${publicacion.id}/solicitudes`}>
                      Solicitudes recibidas →
                    </Link>
                  </p>
                ) : solicitudExistente ? (
                  <p className="dp-reporte-ok" role="status">
                    Ya tienes una solicitud{' '}
                    <strong>
                      {solicitudExistente.status === 'accepted' ? 'aceptada' : 'pendiente'}
                    </strong>{' '}
                    en este proyecto.{' '}
                    <Link className="ic-enlace" to="/mis-solicitudes">
                      Ver mis solicitudes →
                    </Link>
                  </p>
                ) : !proyectoAbierto ? (
                  <p className="dp-aviso" role="status">
                    Este proyecto ya no acepta nuevas solicitudes de vinculación.
                  </p>
                ) : (
                  <button
                    type="button"
                    className="dp-boton"
                    onClick={() => void abrirFormularioSolicitud()}
                    disabled={cargandoPerfilSolicitud || verificandoSolicitud}
                  >
                    {verificandoSolicitud
                      ? 'Verificando estado…'
                      : cargandoPerfilSolicitud
                        ? 'Cargando tu perfil…'
                        : 'Solicitar vinculación →'}
                  </button>
                )
              ) : (
                <Link className="ic-enlace" to="/acceso">
                  Inicia sesión para solicitar vinculación →
                </Link>
              )
            ) : user ? (
              proyectoAbierto ? (
                <Link
                  className="dp-boton"
                  style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}
                  to="/publicaciones/nueva"
                  state={{
                    desdeNecesidad: {
                      id: publicacion.id,
                      titulo: publicacion.titulo,
                      categoriaId: publicacion.categoriaId,
                      ubicacion: publicacion.ubicacion,
                      descripcion: publicacion.descripcion,
                      organizacion: publicacion.organizacion,
                    },
                  }}
                >
                  Crear proyecto para atender esta necesidad →
                </Link>
              ) : (
                <p className="dp-aviso" role="status">
                  Esta necesidad comunitaria ya no está abierta para nuevas propuestas.
                </p>
              )
            ) : (
              <Link className="ic-enlace" to="/acceso">
                Inicia sesión para crear un proyecto que atienda esta necesidad →
              </Link>
            )}

            {confirmacionSolicitud && !solicitudExistente && (
              <p className="dp-reporte-ok" role="status">
                {confirmacionSolicitud}
              </p>
            )}

            {errorPerfilSolicitud && (
              <p className="dp-reporte-error" role="alert">
                {errorPerfilSolicitud}
              </p>
            )}

            <div className="dp-reporte-bloque">
              {user ? (
                <>
                  {!mostrandoReporte ? (
                    <button
                      type="button"
                      className="dp-boton-reporte"
                      onClick={() => {
                        setMostrandoReporte(true);
                        setEstadoReporte(null);
                      }}
                    >
                      Reportar publicación
                    </button>
                  ) : (
                    <form className="dp-reporte-form" onSubmit={enviarReporte}>
                      <label htmlFor="dp-reporte-motivo">
                        Motivo del reporte
                        <select
                          id="dp-reporte-motivo"
                          value={motivoReporte}
                          onChange={(e) => setMotivoReporte(e.target.value as MotivoReporte)}
                        >
                          {MOTIVOS_REPORTE.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label htmlFor="dp-reporte-detalles">
                        Detalles {motivoReporte === 'other' ? '(obligatorio)' : '(opcional)'}
                        <textarea
                          id="dp-reporte-detalles"
                          rows={3}
                          maxLength={1000}
                          placeholder="Describe brevemente el problema detectado..."
                          value={detallesReporte}
                          onChange={(e) => setDetallesReporte(e.target.value)}
                        />
                      </label>

                      <div className="dp-reporte-acciones">
                        <button
                          type="button"
                          className="dp-reporte-cancelar"
                          disabled={enviandoReporte}
                          onClick={() => setMostrandoReporte(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="dp-reporte-enviar"
                          disabled={enviandoReporte}
                        >
                          {enviandoReporte ? 'Enviando…' : 'Enviar reporte'}
                        </button>
                      </div>
                    </form>
                  )}

                  {estadoReporte && (
                    <p
                      className={estadoReporte.tipo === 'ok' ? 'dp-reporte-ok' : 'dp-reporte-error'}
                      role={estadoReporte.tipo === 'ok' ? 'status' : 'alert'}
                    >
                      {estadoReporte.texto}
                    </p>
                  )}
                </>
              ) : (
                <Link className="ic-enlace" to="/acceso">
                  Inicia sesión para reportar esta publicación
                </Link>
              )}
            </div>

            <Link className="dp-enlace-volver" to="/iniciativas">Volver al catálogo →</Link>
          </aside>
        </div>

        <div className="dp-banner">
          <span>¿Quieres explorar otras oportunidades?</span>
          <Link className="ic-enlace" to="/iniciativas">Ver iniciativas →</Link>
        </div>

        <footer className="dp-footer">© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</footer>
      </div>
      {mostrarSolicitud && perfilSolicitud && esProyecto && (
        <SolicitarVinculacionModal
          proyecto={{
            id: publicacion.id,
            titulo: publicacion.titulo,
          }}
          perfil={perfilSolicitud}
          necesidades={publicacion.requirements.flatMap((req) =>
            typeof req.id === 'number' && req.status === 'open'
              ? [
                  {
                    id: req.id,
                    titulo: req.title,
                    disponible: true,
                  },
                ]
              : [],
          )}
          onEnviar={manejarEnvioSolicitud}
          onCerrar={() => {
            setMostrarSolicitud(false);
            setPerfilSolicitud(null);
          }}
        />
      )}
      {imagenAmpliada && (
        <div
          className="dp-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de imagen"
          onClick={() => setImagenAmpliada(null)}
        >
          <div className="dp-lightbox-contenido" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="dp-lightbox-cerrar"
              onClick={() => setImagenAmpliada(null)}
              aria-label="Cerrar imagen"
            >
              ×
            </button>
            <img src={imagenAmpliada} alt={`Vista ampliada de ${publicacion.titulo}`} />
          </div>
        </div>
      )}
    </main>
  );
}