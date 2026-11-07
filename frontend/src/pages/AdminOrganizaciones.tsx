import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPendingAffiliations,
  getPendingOrganizations,
  reviewAffiliation,
  reviewOrganization,
  type PendingAffiliation,
  type PendingOrganization,
} from '../api/profileService';
import { useAuth } from '../context/auth-context';
import '../styles/perfilEspacio.css';

export default function AdminOrganizaciones() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<PendingOrganization[]>([]);
  const [affiliations, setAffiliations] = useState<PendingAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingOrganizations, pendingAffiliations] = await Promise.all([
        getPendingOrganizations(),
        getPendingAffiliations(),
      ]);
      setOrganizations(pendingOrganizations);
      setAffiliations(pendingAffiliations);
    } catch {
      setError('No fue posible cargar las solicitudes pendientes. Verifica los permisos y la conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function review(id: number, status: 'approved' | 'rejected') {
    if (status === 'rejected' && !reasons[`organization-${id}`]?.trim()) {
      setError('Explica el motivo del rechazo antes de continuar.');
      return;
    }
    setBusyId(id);
    setError('');
    try {
      await reviewOrganization(id, status, reasons[`organization-${id}`]?.trim());
      setOrganizations((current) => current.filter((item) => item.id !== id));
    } catch {
      setError('No se pudo guardar la decisión. Vuelve a intentarlo.');
    } finally {
      setBusyId(null);
    }
  }

  async function reviewUserAffiliation(id: number, decision: 'approved' | 'rejected') {
    if (decision === 'rejected' && !reasons[`profile-${id}`]?.trim()) {
      setError('Explica el motivo del rechazo antes de continuar.');
      return;
    }
    setBusyId(id);
    setError('');
    try {
      await reviewAffiliation(id, decision, reasons[`profile-${id}`]?.trim());
      setAffiliations((current) => current.filter((item) => item.id !== id));
    } catch {
      setError('No se pudo guardar la revisión de afiliación. Vuelve a intentarlo.');
    } finally {
      setBusyId(null);
    }
  }

  if (!user?.can_manage_platform) {
    return <div className="pd-pagina"><main className="pd-contenedor"><p className="pd-error" role="alert">No tienes permisos para administrar ProyectaTec.</p><Link to="/">Volver al inicio</Link></main></div>;
  }

  return (
    <div className="pd-pagina">
      <main className="pd-contenedor">
        <header className="pd-encabezado">
          <span className="pd-eyebrow">ADMINISTRACIÓN / ORGANIZACIONES</span>
          <h1>Solicitudes de organización</h1>
          <p>Revisa la información registrada antes de publicar una organización en ProyectaTec.</p>
        </header>
        {error && <p className="pd-error" role="alert">{error}</p>}
        {loading ? <p className="pd-vacio" aria-live="polite">Cargando solicitudes…</p> : (
          <>
          <section className="pd-columna-derecha" aria-labelledby="pending-organizations-title">
            <h2 id="pending-organizations-title">Organizaciones por aprobar</h2>
            {organizations.length === 0 && <p className="pd-vacio">No hay solicitudes de organización pendientes.</p>}
          </section>
          <div className="pd-columna-derecha">
            {organizations.map((organization) => (
              <article className="pd-tarjeta" key={organization.id}>
                <div className="pd-fila-titulo">
                  <div><span className="pd-eyebrow">{organization.organization_type} · {organization.sector || 'Sector no indicado'}</span><h2>{organization.name}</h2></div>
                  <span className="pd-boton-deshabilitado">Pendiente</span>
                </div>
                <p>{organization.location || 'Ubicación no indicada'}</p>
                <p>Razón social: {organization.legal_name || 'No indicada'} · Sitio web: {organization.website || 'No indicado'}</p>
                <p>{organization.email || 'Sin correo de contacto'} · {organization.phone || 'Sin teléfono'}</p>
                <p className="pd-enlace-falso">Solicitada: {new Date(organization.created_at).toLocaleDateString()}</p>
                <div className="pd-campo"><label htmlFor={`organization-reason-${organization.id}`}>Motivo si rechazas esta organización</label><textarea id={`organization-reason-${organization.id}`} maxLength={1000} value={reasons[`organization-${organization.id}`] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [`organization-${organization.id}`]: event.target.value }))} /></div>
                <div className="pd-acciones">
                  <button className="pd-boton-claro" type="button" disabled={busyId === organization.id} onClick={() => void review(organization.id, 'rejected')}>Rechazar</button>
                  <button className="pd-boton-oscuro" type="button" disabled={busyId === organization.id} onClick={() => void review(organization.id, 'approved')}>
                    {busyId === organization.id ? 'Guardando…' : 'Aprobar organización'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <section className="pd-columna-derecha" aria-labelledby="pending-affiliations-title">
            <h2 id="pending-affiliations-title">Cambios de afiliación por revisar</h2>
            {affiliations.length === 0 && <p className="pd-vacio">No hay cambios pendientes de institución u organización.</p>}
            {affiliations.map((request) => (
              <article className="pd-tarjeta" key={request.id}>
                <div className="pd-fila-titulo"><div><h2>{request.user_name}</h2><p>{request.user_email} · {request.account_type}</p></div><span className="pd-boton-deshabilitado">Pendiente</span></div>
                <dl>{Object.entries(request.pending_affiliation).map(([field, value]) => (
                  <div className="pd-info-detalle" key={field}><dt>{field.replaceAll('_', ' ')}</dt><dd>{value || '—'}</dd></div>
                ))}</dl>
                <div className="pd-campo"><label htmlFor={`profile-reason-${request.id}`}>Motivo si rechazas este cambio</label><textarea id={`profile-reason-${request.id}`} maxLength={1000} value={reasons[`profile-${request.id}`] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [`profile-${request.id}`]: event.target.value }))} /></div>
                <div className="pd-acciones">
                  <button className="pd-boton-claro" type="button" disabled={busyId === request.id} onClick={() => void reviewUserAffiliation(request.id, 'rejected')}>Rechazar cambio</button>
                  <button className="pd-boton-oscuro" type="button" disabled={busyId === request.id} onClick={() => void reviewUserAffiliation(request.id, 'approved')}>{busyId === request.id ? 'Guardando…' : 'Aprobar cambio'}</button>
                </div>
              </article>
            ))}
          </section>
          </>
        )}
      </main>
    </div>
  );
}
