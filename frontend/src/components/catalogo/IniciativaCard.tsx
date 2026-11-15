import { Link } from 'react-router-dom';
import type { Iniciativa } from '../../types/iniciativa';
import '../../styles/catalogoComponentes.css';

type Props = { iniciativa: Iniciativa; variante?: 'tarjeta' | 'fila' };

const ETIQUETA_TIPO = { proyecto: 'Proyecto', necesidad: 'Necesidad comunitaria' } as const;
const TEXTO_ENLACE = { proyecto: 'Ver proyecto', necesidad: 'Ver necesidad' } as const;

export default function IniciativaCard({ iniciativa, variante = 'tarjeta' }: Props) {
  const detalle = `/iniciativas/${iniciativa.tipo}/${iniciativa.id}`;
  const etiqueta = ETIQUETA_TIPO[iniciativa.tipo];
  const textoEnlace = TEXTO_ENLACE[iniciativa.tipo];
  const claseTipo = `ic-tipo ic-tipo-${iniciativa.tipo}`;

  if (variante === 'fila') {
    return (
      <article className="ic-fila">
        <div className="ic-fila-contenido">
          {iniciativa.coverImageUrl && (
            <img src={iniciativa.coverImageUrl} alt="" className="ic-fila-thumb" />
          )}
          <div className="ic-fila-texto">
            <span className={claseTipo}>{etiqueta}</span>
            <h3>{iniciativa.titulo}</h3>
            <p>
              {iniciativa.organizacionId ? (
                <Link to={`/organizaciones/${iniciativa.organizacionId}`} className="ic-org-enlace">
                  {iniciativa.organizacion}
                </Link>
              ) : (
                iniciativa.organizacion
              )}{' '}
              · {iniciativa.categoria}
              {iniciativa.requirementsCount > 0 && ` · ${iniciativa.requirementsCount} ${iniciativa.requirementsCount === 1 ? 'requerimiento' : 'requerimientos'}`}
            </p>
          </div>
        </div>
        <Link to={detalle} className="ic-enlace">{textoEnlace} <span aria-hidden="true">→</span></Link>
      </article>
    );
  }
  return (
    <article className="ic-tarjeta">
      <div>
        {iniciativa.coverImageUrl && (
          <img src={iniciativa.coverImageUrl} alt={iniciativa.titulo} className="ic-portada" />
        )}
        <span className={claseTipo}>{etiqueta}</span>
        <div className="ic-meta">
          <span className="ic-categoria">{iniciativa.categoria}</span>
          <span className={['Abierta', 'Activa', 'En curso'].includes(iniciativa.estado) ? 'ic-estado ic-estado-activo' : 'ic-estado'}>{iniciativa.estado}</span>
        </div>
        <h3>{iniciativa.titulo}</h3>
        <p>
          {iniciativa.organizacionId ? (
            <Link to={`/organizaciones/${iniciativa.organizacionId}`} className="ic-org-enlace">
              {iniciativa.organizacion}
            </Link>
          ) : (
            iniciativa.organizacion
          )}
        </p>
        {iniciativa.requirementsCount > 0 && (
          <span className="ic-reqs-pill">
            {iniciativa.requirementsCount} {iniciativa.requirementsCount === 1 ? 'requerimiento' : 'requerimientos'}
          </span>
        )}
      </div>
      <div className="ic-pie"><Link to={detalle} className="ic-enlace">{textoEnlace} <span aria-hidden="true">→</span></Link></div>
    </article>
  );
}