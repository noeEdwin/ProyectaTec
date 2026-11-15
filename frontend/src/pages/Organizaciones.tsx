import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicOrganizations, type OrganizationPublicDirectoryItem } from '../api/profileService';
import '../styles/catalogoComponentes.css';
import '../styles/moderacion.css';

const ETIQUETA_TIPO: Record<string, string> = {
  empresa: 'Empresa',
  institucion_educativa: 'Institución educativa',
  sector_social: 'Sector social',
};

export default function Organizaciones() {
  const [organizations, setOrganizations] = useState<OrganizationPublicDirectoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      void getPublicOrganizations({ q: search, type: typeFilter })
        .then((items) => {
          if (active) setOrganizations(items);
        })
        .catch(() => {
          if (active) setError('No se pudo cargar el directorio de organizaciones.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, typeFilter]);

  return (
    <main className="mi-page">
      <div className="mi-contenido">
        <span className="mi-eyebrow">PROYECTATEC / DIRECTORIO PÚBLICO</span>
        <h1>Organizaciones e instituciones</h1>
        <p className="mi-subtitulo">
          Explora empresas, instituciones educativas y organizaciones sociales verificadas en Oaxaca.
        </p>

        <div className="mod-filtros" style={{ marginTop: 26, marginBottom: 22 }}>
          <input
            type="search"
            aria-label="Buscar organizaciones o instituciones"
            placeholder="Buscar por nombre, sector o ubicación…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label="Filtrar por tipo de organización"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="institucion_educativa">Institución educativa</option>
            <option value="empresa">Empresa</option>
            <option value="sector_social">Sector social</option>
          </select>
        </div>

        {loading ? (
          <p className="ic-mensaje" role="status">Cargando organizaciones…</p>
        ) : error ? (
          <p className="ic-mensaje ic-mensaje-error" role="alert">{error}</p>
        ) : organizations.length === 0 ? (
          <p className="ic-mensaje" role="status">
            No encontramos organizaciones verificadas con esos criterios.
          </p>
        ) : (
          <div className="ic-cuadricula">
            {organizations.map((org) => (
              <article className="ic-tarjeta" key={org.id}>
                <div>
                  <span className="ic-tipo ic-tipo-proyecto">
                    {ETIQUETA_TIPO[org.organization_type] ?? org.organization_type}
                  </span>
                  <div className="ic-meta">
                    <span className="ic-categoria">{org.sector || 'Sin sector'}</span>
                    <span className="ic-estado ic-estado-activo">
                      {org.projects_count} {org.projects_count === 1 ? 'iniciativa' : 'iniciativas'}
                    </span>
                  </div>
                  <h3>{org.name}</h3>
                  <p>{org.location || 'Oaxaca'}</p>
                  {org.description && (
                    <p style={{ marginTop: 8 }}>
                      {org.description.length > 110
                        ? `${org.description.slice(0, 110)}…`
                        : org.description}
                    </p>
                  )}
                </div>
                <div className="ic-pie">
                  <Link to={`/organizaciones/${org.id}`} className="ic-enlace">
                    Ver perfil e iniciativas <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
