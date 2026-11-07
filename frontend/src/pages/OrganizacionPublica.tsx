import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicOrganizationProfile, type OrganizationPublicProfile } from '../api/profileService';
import '../styles/perfilEspacio.css';

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

  return (
    <div className="pd-pagina">
      <main className="pd-contenedor">
        <header className="pd-encabezado">
          <span className="pd-eyebrow">PROYECTATEC / PERFIL PÚBLICO</span>
          <h1>Perfil de organización</h1>
          <p>Información pública de la organización en ProyectaTec.</p>
        </header>
        {loading && validId ? <p className="pd-vacio" aria-live="polite">Cargando perfil…</p> : (!validId || error) ? (
          <section className="pd-tarjeta"><p className="pd-error" role="alert">{error || 'No encontramos esta organización.'}</p><Link to="/">Volver al inicio</Link></section>
        ) : organization && (
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
                  <span className="pd-chip">Organización</span>
                  <span className="pd-identidad-descripcion">{organization.description || 'Sin descripción registrada.'}</span>
                </div>
                {organization.website && <a href={organization.website} target="_blank" rel="noopener noreferrer">Visitar sitio web ↗</a>}
              </div>
            </div>
            <div className="pd-mi-contacto">
              <span className="pd-mini-label">CONTACTO PÚBLICO</span>
              <p>{organization.contact?.email || organization.contact?.phone || 'Sin contacto público registrado'}</p>
              {organization.contact?.email && <a href={`mailto:${organization.contact.email}`}>Enviar correo ↗</a>}
            </div>
            <div className="pd-info-detalle"><span>Sector o actividad</span><strong>{organization.classification || 'No indicado'}</strong></div>
          </section>
        )}
        <footer className="pd-footer"><span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span><Link to="/">Inicio</Link></footer>
      </main>
    </div>
  );
}
