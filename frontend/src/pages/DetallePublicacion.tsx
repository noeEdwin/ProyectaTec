import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  obtenerDetallePublicacion,
  reportarPublicacion,
  type RequerimientoPublicacion,
} from '../api/publicacionesService';
import { useAuth } from '../context/auth-context';
import '../styles/catalogoComponentes.css';

interface DetalleData {
  id: number;
  titulo: string;
  organizacion: string;
  organizacionId: number | null;
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
  const [avisoVinculacion, setAvisoVinculacion] = useState(false);
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
          </section>

          <aside className="dp-tarjeta dp-lateral" aria-label="Participar">
            <h2>{esProyecto ? '¿Te interesa participar?' : '¿Puedes colaborar?'}</h2>
            <p>
              {esProyecto
                ? 'Consulta los detalles y envía una solicitud de vinculación para establecer contacto.'
                : 'Si puedes apoyar esta necesidad, envía una solicitud de vinculación para ponerte en contacto.'}
            </p>
            {/* TODO (Heber): conectar con el flujo real de solicitudes de vinculación. */}
            <button type="button" className="dp-boton" onClick={() => setAvisoVinculacion(true)}>
              Solicitar vinculación →
            </button>
            {avisoVinculacion && (
              <p className="dp-aviso" role="status">
                Las solicitudes de vinculación estarán disponibles próximamente.
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
