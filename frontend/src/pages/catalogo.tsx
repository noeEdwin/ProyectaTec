import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { listarPublicaciones } from '../api/publicacionesService';
import type { PublicacionListado } from '../api/publicacionesService';
import '../styles/catalogo.css';

interface IniciativaTarjetas {
  id: number;
  categoria: string;
  estado: string;
  titulo: string;
  organizacion: string;
  tipo: 'proyecto' | 'necesidad';
}

function formatearIniciativa(item: PublicacionListado): IniciativaTarjetas {
  return {
    id: item.id,
    categoria: item.category?.name?.toUpperCase() ?? `SECTOR ${item.category_id}`,
    estado: item.status === 'in_progress' ? 'En curso' : item.status === 'completed' ? 'Completada' : 'Abierta',
    titulo: item.title,
    organizacion: item.organization?.name ?? item.location ?? (item.type === 'necesidad' ? 'Comunidad de Oaxaca' : 'Iniciativa ProyectaTec'),
    tipo: item.type,
  };
}

export default function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const [iniciativas, setIniciativas] = useState<IniciativaTarjetas[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  useEffect(() => {
    let activo = true;
    void listarPublicaciones()
      .then((items) => {
        if (activo) setIniciativas(items.map(formatearIniciativa));
      })
      .catch(() => {
        if (activo) setErrorCarga(true);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => { activo = false; };
  }, []);

  const iniciativasFiltradas = iniciativas.filter((proyecto) => {
    const coincideTexto = [proyecto.categoria, proyecto.titulo, proyecto.organizacion]
      .join(' ')
      .toLocaleLowerCase('es')
      .includes(searchTerm.trim().toLocaleLowerCase('es'));

    const coincideCategoria =
      categoriaFiltro === 'Todos' ||
      proyecto.categoria.toLocaleLowerCase('es').includes(categoriaFiltro.toLocaleLowerCase('es'));

    return coincideTexto && coincideCategoria;
  });

  const colorTextoOscuro = '#1e293b';
  const colorTextoGris = '#64748b';
  const colorBorde = '#e2e8f0';

  const categoriasMenu = ['Todos', 'Agroindustria', 'Software e IA', 'Turismo', 'Otros sectores'];

  return (
    <main className="catalogo-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Encabezado */}
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ 
            color: '#9C721D', 
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontWeight: '600', 
            fontSize: '0.75rem', 
            letterSpacing: '0.05em',
            borderBottom: '2px solid #F59E0B',
            paddingBottom: '0.25rem'
          }}>
            PROYECTATEC / OPORTUNIDADES
          </span>
        </div>
        <div className="catalogo-heading" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ 
              fontWeight: '700', 
              color: colorTextoOscuro, 
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.02em' 
            }}>
              Iniciativas y residencias
            </h1>
            <p style={{ color: colorTextoGris, fontSize: '1rem', margin: 0 }}>
              Explora proyectos y oportunidades para colaborar en Oaxaca.
            </p>
          </div>
          <span style={{ color: '#0F4C5C', fontWeight: '500', fontSize: '0.875rem' }}>
            {iniciativasFiltradas.length} {iniciativasFiltradas.length === 1 ? 'iniciativa disponible' : 'iniciativas disponibles'}
          </span>
        </div>
      </header>

      {/* 2. Barra de búsqueda y filtros */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ position: 'relative', width: '100%', marginBottom: '1rem' }}>
          <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </span>
          <input 
            type="text" 
            placeholder="Buscar por sector, proyecto o tecnología..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '1.1rem 7rem 1.1rem 3.25rem', borderRadius: '0.75rem', border: `1px solid ${colorBorde}`, outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', color: colorTextoOscuro }}
          />
          <button type="button" onClick={() => setSearchParams(searchTerm.trim() ? { q: searchTerm.trim() } : {})} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', backgroundColor: '#111827', color: 'white', padding: '0.7rem 2rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}>
            Buscar
          </button>
        </div>

        <div className="catalogo-filtros" style={{ display: 'flex', gap: '0.75rem' }}>
          {categoriasMenu.map((cat, index) => {
            const estaActiva = categoriaFiltro === cat;
            return (
              <button
                key={index}
                onClick={() => setCategoriaFiltro(cat)}
                style={{
                  padding: '0.45rem 1.25rem',
                  borderRadius: '2rem',
                  border: estaActiva ? 'none' : `1px solid ${colorBorde}`,
                  backgroundColor: estaActiva ? '#0F4C5C' : 'transparent',
                  color: estaActiva ? 'white' : colorTextoGris,
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.85rem'
                }}>
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Proyectos destacados */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: colorTextoOscuro, margin: 0 }}>Proyectos destacados</h2>
          <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Selecciona un proyecto para conocer sus detalles</span>
        </div>

        {errorCarga && !cargando && (
          <p role="alert" style={{ color: '#b91c1c', padding: '2rem 0' }}>
            No se pudieron cargar las publicaciones. Revisa tu conexión e inténtalo de nuevo.
          </p>
        )}
        {cargando ? (
          <p style={{ color: colorTextoGris, padding: '2rem 0' }}>Cargando iniciativas desde la base de datos...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
            {iniciativasFiltradas.map((proyecto) => (
              <article key={`${proyecto.tipo}-${proyecto.id}`} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: `1px solid ${colorBorde}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em' }}>
                    <span style={{ color: '#A56B12' }}>{proyecto.categoria}</span>
                    <span style={{
                      color: proyecto.estado === 'Abierta' || proyecto.estado === 'Activa' ? '#146A57' : '#687484',
                      fontWeight: '500'
                    }}>{proyecto.estado}</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.5rem', color: colorTextoOscuro, lineHeight: '1.4', letterSpacing: '-0.01em' }}>{proyecto.titulo}</h3>
                  <p style={{ color: colorTextoGris, fontSize: '0.85rem', margin: 0 }}>{proyecto.organizacion}</p>
                </div>

                {/* Separador interno de la tarjeta con redirección a detalle */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: `1px solid #f1f5f9` }}>
                  <Link
                    to={`/iniciativas/${proyecto.tipo}/${proyecto.id}`}
                    style={{ color: '#0F4C5C', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
                    Ver proyecto <span style={{ marginLeft: '0.25rem', fontSize: '1.1rem' }}>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {!cargando && iniciativasFiltradas.length === 0 && (
          <p role="status" style={{ color: colorTextoGris, padding: '2rem 0' }}>
            No se encontraron iniciativas registradas {searchTerm && `para «${searchTerm}»`}.
          </p>
        )}
      </section>

      {/* 4. Paginación */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem', paddingTop: '1.5rem' }}>
        <span style={{ color: colorTextoGris, fontSize: '0.85rem' }}>Mostrando {iniciativasFiltradas.length} de {iniciativas.length} iniciativas</span>
        <button style={{ padding: '0.5rem 1.25rem', borderRadius: '2rem', border: `1px solid ${colorBorde}`, backgroundColor: 'white', color: '#0F4C5C', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
          Ver más iniciativas <span style={{ marginLeft: '0.25rem', fontSize: '1.1rem' }}>→</span>
        </button>
      </footer>

    </main>
  );
}
