import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarPublicaciones } from '../api/publicacionesService';
import { adaptarIniciativa, categoriasDe, filtrarIniciativas } from '../types/iniciativa';
import type { Iniciativa } from '../types/iniciativa';
import IniciativaCard from '../components/catalogo/IniciativaCard';
import EstadoCatalogo from '../components/catalogo/EstadoCatalogo';
import '../styles/catalogo.css';
import '../styles/catalogoComponentes.css';

export default function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [texto, setTexto] = useState(searchParams.get('q') ?? '');
  const [categoria, setCategoria] = useState('Todos');
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    void listarPublicaciones()
      .then((items) => { if (activo) setIniciativas(items.map(adaptarIniciativa)); })
      .catch(() => { if (activo) setError(true); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [intento]);

  // Los filtros salen de las categorías reales de las publicaciones.
  const categoriasMenu = ['Todos', ...categoriasDe(iniciativas)];
  const coincidencias = filtrarIniciativas(iniciativas, texto, categoria);
  const tarjetas = coincidencias.slice(0, 6);
  const urlMas = `/iniciativas/mas?${new URLSearchParams({ q: texto.trim(), categoria }).toString()}`;

  function reintentar() {
    setCargando(true);
    setError(false);
    setIntento((n) => n + 1);
  }

  return (
    <main className="catalogo-page" style={{ backgroundColor:'#fff', minHeight:'calc(100vh - 80px)', fontFamily:'"Plus Jakarta Sans", "Inter", sans-serif' }}>
      <header style={{ marginBottom:'30px' }}>
        <span className="mi-eyebrow">PROYECTATEC / OPORTUNIDADES</span>
        <div className="catalogo-heading" style={{ display:'flex', justifyContent:'space-between', marginTop:'24px' }}>
          <div>
            <h1 style={{ color:'#111827', margin:'0 0 5px', letterSpacing:'-.02em' }}>Iniciativas y residencias</h1>
            <p style={{ color:'#64748b', margin:0 }}>Explora proyectos y oportunidades para colaborar en Oaxaca.</p>
          </div>
          <span style={{ color:'#0f4c5c', fontWeight:600, fontSize:13 }}>
            {cargando ? 'Cargando iniciativas…' : `${coincidencias.length} iniciativas disponibles`}
          </span>
        </div>
      </header>

      <section aria-label="Búsqueda y filtros" style={{ marginBottom:38 }}>
        <form onSubmit={(e) => { e.preventDefault(); setSearchParams(texto.trim() ? { q:texto.trim() } : {}); }}
          style={{ display:'flex', gap:10, alignItems:'center', border:'1px solid #e2e8f0', borderRadius:12, padding:'7px 8px 7px 17px' }}>
          <span aria-hidden="true" style={{ color:'#94a3b8' }}>⌕</span>
          <input type="search" aria-label="Buscar iniciativas" placeholder="Buscar por sector, proyecto o tecnología…"
            value={texto} onChange={(e) => setTexto(e.target.value)}
            style={{ flex:1, minWidth:0, border:'none', outline:'none', padding:'10px 0', color:'#111827' }}/>
          <button type="submit" style={{ background:'#111827', color:'#fff', border:0, borderRadius:25, padding:'10px 22px', cursor:'pointer' }}>Buscar</button>
        </form>
        <div className="catalogo-filtros" style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:18 }}>
          {categoriasMenu.map((cat) => (
            <button type="button" key={cat} aria-pressed={categoria === cat} onClick={() => setCategoria(cat)}
              style={{ border:categoria === cat ? '1px solid #0f4c5c' : '1px solid #e2e8f0', background:categoria === cat ? '#0f4c5c' : '#fff', color:categoria === cat ? '#fff' : '#64748b', padding:'9px 18px', borderRadius:25, cursor:'pointer' }}>
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Proyectos destacados">
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'baseline', gap:12, marginBottom:20 }}>
          <h2 style={{ color:'#111827', fontSize:20, margin:0 }}>Proyectos destacados</h2>
          <span style={{ color:'#94a3b8', fontSize:13 }}>Selecciona un proyecto para conocer sus detalles</span>
        </div>
        <EstadoCatalogo cargando={cargando} error={error} vacio={!error && coincidencias.length === 0}
          mensajeVacio="No se encontraron iniciativas con esos criterios." onReintentar={reintentar}/>
        {!cargando && !error && tarjetas.length > 0 && (
          <div className="ic-cuadricula">
            {tarjetas.map((item) => <IniciativaCard key={`${item.tipo}-${item.id}`} iniciativa={item} />)}
          </div>
        )}
      </section>

      <footer style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:14, marginTop:44, borderTop:'1px solid #e2e8f0', paddingTop:24 }}>
        <span style={{ color:'#64748b', fontSize:13 }}>Mostrando {tarjetas.length} de {coincidencias.length} iniciativas</span>
        <Link to={urlMas} style={{ border:'1px solid #e2e8f0', color:'#0f4c5c', textDecoration:'none', borderRadius:24, padding:'11px 22px', fontWeight:700, fontSize:13 }}>
          Ver más iniciativas <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </main>
  );
}