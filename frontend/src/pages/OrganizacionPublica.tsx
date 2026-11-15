import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicOrganizationProfile, type OrganizationPublicProfile } from '../api/profileService';
import '../styles/perfilEspacio.css';
import '../styles/catalogoComponentes.css';

const ETIQUETA_TIPO_ORG: Record<string, string> = {
  empresa: 'Empresa',
  institucion_educativa: 'Institución educativa',
  sector_social: 'Sector social',
};

const ETIQUETA_ESTADO_PROYECTO: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En curso',
  completed: 'Completada',
};

export default function OrganizacionPublica() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const validId = Number.isSafeInteger(id) && id > 0;
  const [organization, setOrganization] = useState<OrganizationPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!validId) return () => { active = false; };
    void getPublicOrganizationProfile(id)
      .then((data) => { if (active) setOrganization(data); })
      .catch(() => { if (active) setError('No se pudo cargar el perfil de la organización.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, validId]);

  const tipoLabel = organization?.organization_type
    ? (ETIQUETA_TIPO_ORG[organization.organization_type] ?? organization.organization_type)
    : 'Organización';
  const projects = organization?.projects ?? [];

  return (
    <div className="pd-pagina">
      <main className="pd-contenedor">
        <header className="pd-encabezado pd-encabezado-con-accion">
          <div>
            <span className="pd-eyebrow">PROYECTATEC / PERFIL PÚBLICO</span>
            <h1>Perfil de organización</h1>
            <p>Información pública e iniciativas activas de la organización en ProyectaTec.</p>
          </div>
          <Link to="/organizaciones" className="pd-boton-claro" style={{ textDecoration: 'none' }}>
            ← Todas las organizaciones
          </Link>
        </header>

        {loading && validId ? (
          <p className="pd-vacio" aria-live="polite">Cargando perfil…</p>
        ) : (!validId || error) ? (
          <section className="pd-tarjeta">
            <p className="pd-error" role="alert">{error || 'No encontramos esta organización.'}</p>
            <div style={{ marginTop: 14 }}>
              <Link to="/organizaciones" className="ic-enlace">← Volver al directorio de organizaciones</Link>
            </div>
          </section>
        ) : organization && (
          <>
            <section className="pd-tarjeta pd-mi-resumen" aria-label={`Perfil público de ${organization.name}`}>
              <div className="pd-mi-identidad">
                <div className="pd-avatar" aria-hidden="true">
                  {organization.image_url
                    ? <img src={organization.image_url} alt="" />
                    : organization.name.trim().slice(0, 2).toUpperCase()}
                </div>
                <div className="pd-identidad-info">
                  <h2>{organization.name}</h2>
                  <p>{organization.location || 'Ubicación no indicada'}</p>
                  <div className="pd-identidad-meta">
                    <span className="pd-chip">{tipoLabel}</span>
                    <span className="pd-identidad-descripcion">{organization.description || 'Sin descripción registrada.'}</span>
                  </div>
                  {organization.website && (
                    <div style={{ marginTop: 10 }}>
                      <a href={organization.website} target="_blank" rel="noopener noreferrer" className="ic-enlace">
                        Visitar sitio web ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="pd-mi-contacto">
                <span className="pd-mini-label">CONTACTO PÚBLICO</span>
                <p>{organization.contact?.email || organization.contact?.phone || 'Sin contacto público registrado'}</p>
                {organization.contact?.email && <a href={`mailto:${organization.contact.email}`}>Enviar correo ↗</a>}
              </div>
              <div className="pd-info-detalle">
                <span>Sector o actividad</span>
                <strong>{organization.classification || organization.sector || 'No indicado'}</strong>
              </div>
            </section>

            <section className="pd-tarjeta pd-iniciativas" aria-label="Iniciativas activas">
              <div className="pd-fila-titulo">
                <h2>Iniciativas activas ({projects.length})</h2>
                <Link to="/iniciativas">Explorar catálogo →</Link>
              </div>
              {projects.length === 0 ? (
                <p className="pd-vacio" style={{ paddingLeft: 0 }}>
                  Esta organización aún no tiene iniciativas públicas activas.
                </p>
              ) : (
                <ul>
                  {projects.map((proj) => (
                    <li key={proj.id}>
                      <div className="ic-fila-contenido">
                        {proj.cover_image_url && (
                          <img src={proj.cover_image_url} alt="" className="ic-fila-thumb" />
                        )}
                        <div>
                          <h3>
                            <Link to={`/iniciativas/proyecto/${proj.id}`} className="ic-org-enlace">
                              {proj.title}
                            </Link>
                          </h3>
                          <p>
                            {proj.category?.name ?? 'Sin categoría'}
                            {proj.location ? ` · ${proj.location}` : ''}
                            {proj.modality ? ` · ${proj.modality}` : ''}
                          </p>
                        </div>
                      </div>
                      <span>{ETIQUETA_ESTADO_PROYECTO[proj.status] ?? proj.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <footer className="pd-footer">
          <span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span>
          <Link to="/">Inicio</Link>
        </footer>
      </main>
    </div>
  );
}
