import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarPublicaciones } from '../api/publicacionesService';
import { adaptarIniciativa, filtrarIniciativas } from '../types/iniciativa';
import type { Iniciativa } from '../types/iniciativa';
import IniciativaCard from '../components/catalogo/IniciativaCard';
import EstadoCatalogo from '../components/catalogo/EstadoCatalogo';
import '../styles/catalogoComponentes.css';

export default function MasIniciativas() {
  const [parametros] = useSearchParams();
  const [items, setItems] = useState<Iniciativa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    void listarPublicaciones()
      .then((datos) => { if (activo) setItems(datos.map(adaptarIniciativa)); })
      .catch(() => { if (activo) setError(true); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const visibles = filtrarIniciativas(items, parametros.get('q') ?? '', parametros.get('categoria') ?? 'Todos').slice(6);
  return (
    <main className="mi-page">
      <div className="mi-contenido">
        <header>
          <span className="mi-eyebrow">PROYECTATEC / MÁS INICIATIVAS</span>
          <h1>Explorar más iniciativas</h1>
          <p className="mi-subtitulo">Descubre otros proyectos y posibilidades de colaboración.</p>
        </header>
        <section className="mi-panel" aria-label="Otras oportunidades">
          <h2>Otras oportunidades</h2>
          <EstadoCatalogo cargando={cargando} error={error} vacio={!cargando && visibles.length === 0}
            mensajeVacio="Por ahora no hay más iniciativas disponibles con los filtros seleccionados." />
          {!cargando && !error && visibles.map((item) => <IniciativaCard key={`${item.tipo}-${item.id}`} iniciativa={item} variante="fila" />)}
        </section>
        <div className="mi-volver"><Link to="/iniciativas">Volver al catálogo</Link></div>
      </div>
    </main>
  );
}
