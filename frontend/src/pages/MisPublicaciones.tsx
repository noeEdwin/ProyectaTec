import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { listarMisPublicaciones } from '../api/publicacionesService';
import type { MiPublicacion } from '../api/publicacionesService';
import '../styles/publicaciones.css';

const estadoLegible: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En curso',
  completed: 'Completada',
  draft: 'Borrador',
  closed: 'Cerrada',
  withdrawn: 'Retirada',
};

export default function MisPublicaciones() {
  const [publications, setPublications] = useState<MiPublicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPublications(await listarMisPublicaciones());
    } catch (err) {
      setError(axios.isAxiosError(err) && err.response?.status === 401
        ? 'Tu sesión expiró. Inicia sesión nuevamente.'
        : 'No se pudieron cargar tus publicaciones. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    void listarMisPublicaciones()
      .then((items) => { if (activo) setPublications(items); })
      .catch((err: unknown) => {
        if (!activo) return;
        setError(axios.isAxiosError(err) && err.response?.status === 401
          ? 'Tu sesión expiró. Inicia sesión nuevamente.'
          : 'No se pudieron cargar tus publicaciones. Intenta de nuevo.');
      })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, []);

  return (
    <main className="pub-page">
      <div className="pub-contenedor pub-mis-contenedor">
        <header className="pub-encabezado">
          <p className="pub-eyebrow"><span>PROYECTATEC / TU ESPACIO</span></p>
          <h1>Mis publicaciones</h1>
          <p className="pub-subtitulo">Consulta y actualiza los proyectos y necesidades que puedes administrar.</p>
        </header>

        <div className="pub-mis-toolbar">
          <span>{loading ? 'Cargando…' : `${publications.length} ${publications.length === 1 ? 'publicación' : 'publicaciones'}`}</span>
          <Link className="pub-boton pub-boton-primario" to="/publicaciones/nueva">Crear publicación</Link>
        </div>

        {error && <div className="pub-alerta" role="alert">{error} <button type="button" onClick={() => void cargar()}>Reintentar</button></div>}
        {loading && <p className="pub-mis-estado" role="status">Cargando tus publicaciones…</p>}
        {!loading && !error && publications.length === 0 && (
          <section className="pub-card pub-mis-vacio">
            <span className="pub-mis-vacio-icon" aria-hidden="true">＋</span>
            <h2>Aún no tienes publicaciones</h2>
            <p className="pub-texto">Crea un proyecto o comparte una necesidad comunitaria. Luego podrás volver aquí para editarla.</p>
            <Link className="pub-boton pub-boton-primario" to="/publicaciones/nueva">Crear mi primera publicación</Link>
          </section>
        )}

        <section className="pub-mis-lista" aria-label="Publicaciones editables">
          {publications.map((publication) => (
            <article className="pub-card pub-mis-item" key={`${publication.type}-${publication.id}`}>
              <div className="pub-mis-item-copy">
                <div className="pub-mis-tags">
                  <span>{publication.type === 'proyecto' ? 'Proyecto' : 'Necesidad comunitaria'}</span>
                  <span>{estadoLegible[publication.status] ?? publication.status}</span>
                </div>
                <h2>{publication.title}</h2>
                <p>{publication.description}</p>
                <small>Actualizada {publication.updated_at ? new Date(publication.updated_at).toLocaleDateString('es-MX') : 'recientemente'}</small>
              </div>
              {publication.can_edit && (
                <Link className="pub-boton pub-boton-secundario" to={`/publicaciones/${publication.type}/${publication.id}/editar`} aria-label={`Editar ${publication.title}`}>
                  Editar publicación <span aria-hidden="true">→</span>
                </Link>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
