import { Link } from 'react-router-dom';
import type { Iniciativa } from '../../types/iniciativa';
import '../../styles/catalogoComponentes.css';

type Props = { iniciativa: Iniciativa; variante?: 'tarjeta' | 'fila' };

export default function IniciativaCard({ iniciativa, variante = 'tarjeta' }: Props) {
  const detalle = `/iniciativas/${iniciativa.tipo}/${iniciativa.id}`;
  if (variante === 'fila') {
    return (
      <article className="ic-fila">
        <div className="ic-fila-texto">
          <h3>{iniciativa.titulo}</h3>
          <p>{iniciativa.organizacion} · {iniciativa.categoria}</p>
        </div>
        <Link to={detalle} className="ic-enlace">Ver proyecto <span aria-hidden="true">→</span></Link>
      </article>
    );
  }
  return (
    <article className="ic-tarjeta">
      <div>
        <div className="ic-meta">
          <span className="ic-categoria">{iniciativa.categoria}</span>
          <span className={['Abierta', 'Activa', 'En curso'].includes(iniciativa.estado) ? 'ic-estado ic-estado-activo' : 'ic-estado'}>{iniciativa.estado}</span>
        </div>
        <h3>{iniciativa.titulo}</h3>
        <p>{iniciativa.organizacion}</p>
      </div>
      <div className="ic-pie"><Link to={detalle} className="ic-enlace">Ver proyecto <span aria-hidden="true">→</span></Link></div>
    </article>
  );
}
