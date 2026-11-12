import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { obtenerDetallePublicacion } from '../api/publicacionesService';
import '../styles/catalogoComponentes.css';

interface DetalleData {
  id: number;
  titulo: string;
  organizacion: string;
  sector: string;
  ubicacion: string;
  modalidad: string;
  descripcion: string;
  tipo: 'project' | 'community_need';
}

const MODALIDADES: Record<string, string> = {
  presencial: 'Presencial',
  hibrida: 'Híbrida',
  remota: 'Remota',
};

export default function DetallePublicacion() {
  const { tipo, id } = useParams<{ tipo: string; id: string }>();
  const [publicacion, setPublicacion] = useState<DetalleData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avisoVinculacion, setAvisoVinculacion] = useState(false);

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

        setPublicacion({
          id: item.id,
          titulo: item.title ?? 'Publicación sin título',
          organizacion: item.organization?.name || (esProyecto ? 'Iniciativa ProyectaTec' : 'Comunidad de Oaxaca'),
          sector: item.category?.name || `Sector ${item.category_id}`,
          ubicacion: item.location || 'Oaxaca',
          modalidad: item.modality ? (MODALIDADES[item.modality] ?? item.modality) : '',
          descripcion: item.description || 'Sin descripción detallada.',
          tipo: esProyecto ? 'project' : 'community_need',
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
        <p className="dp-subtitulo">{publicacion.organizacion} · {publicacion.sector} · {publicacion.ubicacion}</p>

        <div className="dp-grid">
          <section className="dp-tarjeta" aria-label="Información de la publicación">
            <h2>{esProyecto ? 'Sobre el proyecto' : 'Sobre la necesidad'}</h2>
            <p>{publicacion.descripcion}</p>

            <div className="dp-bloque">
              <h3>Información general</h3>
              <dl className="dp-datos">
                <div><dt>Sector</dt><dd>{publicacion.sector}</dd></div>
                <div><dt>Ubicación</dt><dd>{publicacion.ubicacion}</dd></div>
                {publicacion.modalidad && <div><dt>Modalidad</dt><dd>{publicacion.modalidad}</dd></div>}
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
            <Link className="dp-enlace-volver" to="/iniciativas">Volver al catálogo →</Link>
          </aside>
        </div>

        <div className="dp-banner">
          <span>¿Quieres explorar otras oportunidades?</span>
          <Link className="ic-enlace" to="/iniciativas">Ver iniciativas →</Link>
        </div>

        <footer className="dp-footer">© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</footer>
      </div>
    </main>
  );
}