import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicacionesIniciales, solicitudesIniciales } from '../data/publicacionesIniciales';
import type { PublicacionPanel, SolicitudPanel } from '../types/publicacionesPanel';
import '../styles/publicacionesPanel.css';

type Props = {
  publicaciones?: PublicacionPanel[];
  solicitudes?: SolicitudPanel[];
  cargando?: boolean;
  error?: string | null;
};

/** Panel presentacional. El contenedor futuro podrá inyectar aquí datos reales de Laravel. */
export default function PublicacionesVinculaciones({
  publicaciones = publicacionesIniciales,
  solicitudes = solicitudesIniciales,
  cargando = false,
  error = null,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'Todas' | 'Activas' | 'Cerradas'>('Todas');
  const filtradas = useMemo(() => publicaciones.filter((item) => {
    const texto = `${item.titulo} ${item.organizacion} ${item.categoria}`.toLocaleLowerCase('es-MX');
    const coincide = texto.includes(busqueda.trim().toLocaleLowerCase('es-MX'));
    const cerrado = ['Cerrada', 'Completada', 'Retirada'].includes(item.estado);
    return coincide && (filtro === 'Todas' || (filtro === 'Cerradas' ? cerrado : !cerrado));
  }), [publicaciones, busqueda, filtro]);
  const destacada = filtradas[0];
  const adicionales = filtradas.slice(1);
  const enCurso = publicaciones.filter((p) => ['En curso', 'En ejecución', 'Activa'].includes(p.estado)).length;
  const temporal = publicaciones === publicacionesIniciales;

  function enlaceDetalle(item: PublicacionPanel) {
    if (item.id === null) return <span className="pav-enlace pav-no-disponible" title="Disponible cuando se conecte la API">Ver publicación →</span>;
    return <Link className="pav-enlace" to={`/publicaciones/${item.tipo}/${item.id}`}>Ver publicación →</Link>;
  }

  return (
    <main className="pav-pagina">
      <div className="pav-contenedor">
        <header className="pav-cabecera">
          <div>
            <span className="pav-eyebrow">GESTIÓN DE VINCULACIÓN</span>
            <h1>Publicaciones y vinculaciones</h1>
            <p>Gestiona iniciativas, solicitudes y colaboraciones desde un solo lugar.</p>
          </div>
          <Link to="/publicaciones/nueva" className="pav-boton-principal">Nueva publicación +</Link>
        </header>
        {temporal && <p className="pav-aviso" role="status">Vista de referencia visual. Las cifras y registros mostrados no provienen de la base de datos.</p>}
        <section className="pav-filtros" aria-label="Buscar y filtrar publicaciones">
          <div className="pav-busqueda"><span aria-hidden="true">⌕</span><input type="search" aria-label="Buscar publicaciones" placeholder="Buscar publicaciones o proyectos…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}/></div>
          <div className="pav-pildoras">
            {(['Todas', 'Activas', 'Cerradas'] as const).map((estado) => <button key={estado} type="button" aria-pressed={filtro === estado} className={filtro === estado ? 'pav-activa' : ''} onClick={() => setFiltro(estado)}>{estado}</button>)}
          </div>
          <span className="pav-total">{filtradas.length} publicaciones</span>
        </section>

        {cargando && <p className="pav-estado" role="status">Cargando publicaciones…</p>}
        {error && <p className="pav-estado pav-error" role="alert">{error}</p>}
        {!cargando && !error && filtradas.length === 0 && <p className="pav-estado" role="status">No se encontraron publicaciones para la búsqueda o filtro seleccionados.</p>}

        {!cargando && !error && (
          <>
            <section className="pav-principal" aria-label="Publicación destacada y resumen">
              {destacada ? (
                <article className="pav-tarjeta pav-destacada">
                  <div className="pav-destacada-top"><span className="pav-etiqueta">PUBLICACIÓN DESTACADA</span><span className="pav-estado-publicacion">{destacada.estado}</span></div>
                  <h2>{destacada.titulo}</h2>
                  <p className="pav-organizacion">{destacada.organizacion}</p>
                  <div className="pav-metadata">
                    <div><small>SECTOR</small><strong>{destacada.categoria}</strong></div>
                    <div><small>UBICACIÓN</small><strong>{destacada.ubicacion ?? 'Sin especificar'}</strong></div>
                    <div><small>MODALIDAD</small><strong>{destacada.modalidad ?? 'Sin especificar'}</strong></div>
                  </div>
                  <div className="pav-seguimiento"><div className="pav-seguimiento-cabecera"><strong>Seguimiento</strong><span>{destacada.etapaActual && destacada.etapasTotales ? `${destacada.estado} · Etapa ${destacada.etapaActual} de ${destacada.etapasTotales}` : destacada.estado}</span></div>
                    <div className="pav-progreso"><div style={{ width:destacada.etapaActual && destacada.etapasTotales ? `${Math.min(100, Math.max(0, destacada.etapaActual / destacada.etapasTotales * 100))}%` : '0%' }}/></div>
                    <div className="pav-pie"><div><small>Participantes</small><p>{destacada.participantes ?? 'Sin información disponible'}</p></div>{enlaceDetalle(destacada)}</div>
                  </div>
                </article>
              ) : <div className="pav-tarjeta pav-estado">Sin publicación destacada</div>}
              <aside className="pav-lateral">
                <section className="pav-tarjeta pav-resumen"><h2>Resumen</h2><div className="pav-estadisticas"><div><strong>{publicaciones.length}</strong><span>Publicaciones</span></div><div><strong>{enCurso}</strong><span>En ejecución</span></div><div><strong>{solicitudes.length}</strong><span>Solicitudes</span></div></div></section>
                <section className="pav-tarjeta pav-solicitudes"><div className="pav-seccion-titulo"><h2>Solicitudes recientes</h2><span className="pav-no-disponible" title="Se conectará con la API">Ver todas →</span></div>
                  {solicitudes.length === 0 && <p>No hay solicitudes recientes.</p>}
                  {solicitudes.slice(0, 2).map((s, i) => <div className="pav-solicitud" key={`${s.id ?? 'temporal'}-${i}`}><span className="pav-avatar">{s.nombre.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}</span><div><strong>{s.nombre}</strong><small>{s.descripcion}</small></div><span className="pav-no-disponible" title="Se conectará con la API">Ver →</span></div>)}
                </section>
              </aside>
            </section>
            <section className="pav-tarjeta pav-otras"><div className="pav-seccion-titulo"><h2>Otras publicaciones</h2><Link className="pav-enlace" to="/iniciativas">Ver catálogo completo →</Link></div>
              <div className="pav-otras-grid">{adicionales.length === 0 && <p>No hay publicaciones adicionales.</p>}{adicionales.map((item, i) => <article className="pav-otra" key={`${item.tipo}-${item.id ?? i}`}><div><h3>{item.titulo}</h3><p>{item.organizacion}</p></div><span>{item.estado}</span></article>)}</div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
