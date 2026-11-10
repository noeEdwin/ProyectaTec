import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { obtenerDetallePublicacion } from '../api/publicacionesService';

interface DetalleData {
  id: number;
  titulo: string;
  organizacion: string;
  sector: string;
  ubicacion: string;
  modalidad?: string;
  descripcion: string;
  tipo: 'project' | 'community_need';
}

export default function DetallePublicacion() {
  const { tipo, id } = useParams<{ tipo: string; id: string }>();
  const [publicacion, setPublicacion] = useState<DetalleData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          organizacion: item.organization?.name || item.location || 'Iniciativa ProyectaTec',
          sector: item.category?.name || `Sector ${item.category_id}`,
          ubicacion: item.location || 'Oaxaca',
          modalidad: item.modality || '',
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
      cargarDetalle();
    }
  }, [id, tipo]);

  const colorTextoOscuro = '#1e293b';
  const colorTextoGris = '#64748b';
  const colorBorde = '#e2e8f0';

  if (cargando) {
    return (
      <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1.5rem', fontFamily: '"Plus Jakarta Sans", sans-serif', color: colorTextoGris }}>
        Cargando detalles de la publicación...
      </div>
    );
  }

  if (error || !publicacion) {
    return (
      <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1.5rem', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'Publicación no encontrada.'}</p>
        <Link to="/iniciativas" style={{ color: '#0F4C5C', fontWeight: '600', textDecoration: 'none' }}>
          ← Volver a iniciativas
        </Link>
      </div>
    );
  }

  return (
    <main style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif', paddingBottom: '4rem' }}>

      {/* Encabezado superior con botón Volver */}
      <div style={{ borderBottom: `1px solid ${colorBorde}`, padding: '1rem 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '700', fontSize: '1.25rem', color: colorTextoOscuro }}>
            ProyectaTec<span style={{ color: '#F59E0B' }}>.</span>
          </span>
          <Link to="/iniciativas" style={{ color: colorTextoOscuro, textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500' }}>
            ← Volver a iniciativas
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '2.5rem auto 0', padding: '0 1.5rem' }}>

        {/* Breadcrumb / Categoría */}
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ color: '#9C721D', fontWeight: '600', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '2px solid #F59E0B', paddingBottom: '0.2rem' }}>
            INICIATIVA / PROYECTATEC
          </span>
        </div>

        {/* Título y Subtítulo */}
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: colorTextoOscuro, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          {publicacion.titulo}
        </h1>
        <p style={{ color: colorTextoGris, fontSize: '0.95rem', margin: '0 0 2.5rem 0' }}>
          {publicacion.organizacion} · {publicacion.sector} · {publicacion.ubicacion}
        </p>

        {/* Rejilla de contenido principal y lateral */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>

          {/* Tarjeta Izquierda: Información de la iniciativa */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: `1px solid ${colorBorde}`, padding: '2rem' }}>
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: colorTextoOscuro, marginBottom: '0.85rem' }}>
                Sobre la iniciativa
              </h2>
              <p style={{ color: colorTextoGris, fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                {publicacion.descripcion}
              </p>
            </section>

            <div style={{ borderTop: `1px solid ${colorBorde}`, paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: colorTextoOscuro, marginBottom: '0.5rem' }}>
                Información general
              </h3>
              <p style={{ color: colorTextoGris, fontSize: '0.875rem', margin: 0 }}>
                Sector: <strong>{publicacion.sector}</strong> | Ubicación: <strong>{publicacion.ubicacion}</strong>
                {publicacion.modalidad && ` | Modalidad: ${publicacion.modalidad}`}
              </p>
            </div>

            <div style={{ borderTop: `1px solid ${colorBorde}`, paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: colorTextoOscuro, marginBottom: '0.5rem' }}>
                Colaboración abierta
              </h3>
              <p style={{ color: colorTextoGris, fontSize: '0.875rem', margin: 0 }}>
                Los alcances, requisitos y condiciones se confirman con la entidad responsable de la publicación.
              </p>
            </div>
          </div>

          {/* Tarjeta Derecha: Acción / Solicitar vinculación */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: `1px solid ${colorBorde}`, padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: colorTextoOscuro, marginBottom: '1rem' }}>
              ¿Te interesa participar?
            </h2>
            <p style={{ color: colorTextoGris, fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Consulta los detalles y envía una solicitud de vinculación para establecer contacto.
            </p>

            <button
              onClick={() => alert('Solicitud enviada o redirección al flujo de participación.')}
              style={{ width: '100%', backgroundColor: '#111827', color: 'white', padding: '0.85rem 1.25rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              Solicitar vinculación →
            </button>

            <p style={{ color: colorTextoGris, fontSize: '0.75rem', lineHeight: '1.4', marginBottom: '1.5rem' }}>
              Esta acción conduce a la pantalla de solicitudes en el prototipo.
            </p>

            <div style={{ textAlign: 'right' }}>
              <Link to="/iniciativas" style={{ color: '#0F4C5C', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem' }}>
                Volver al catálogo →
              </Link>
            </div>
          </div>

        </div>

        {/* Banner Inferior */}
        <div style={{ marginTop: '2.5rem', backgroundColor: 'white', borderRadius: '0.75rem', border: `1px solid ${colorBorde}`, padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '700', color: colorTextoOscuro, fontSize: '0.95rem' }}>
            ¿Quieres explorar otras oportunidades?
          </span>
          <Link to="/iniciativas" style={{ color: '#0F4C5C', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
            Ver iniciativas →
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ maxWidth: '1100px', margin: '3rem auto 0', padding: '1.5rem 1.5rem 0', borderTop: `1px solid ${colorBorde}`, color: colorTextoGris, fontSize: '0.75rem' }}>
        © 2026 ProyectaTec · Instituto Tecnológico de Oaxaca
      </footer>
    </main>
  );
}
