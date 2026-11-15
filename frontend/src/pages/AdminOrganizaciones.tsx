import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  adminCreateOrganization,
  getPendingAdminOrganizationQueue,
  getPendingAffiliations,
  reviewAffiliation,
  reviewOrganization,
  reviewOrganizationMemberRequest,
  type PendingAffiliation,
  type PendingOrganization,
  type PendingOwnershipRequest,
} from '../api/profileService';
import Toast, { type ToastMessage } from '../components/Toast';
import { useAuth } from '../context/auth-context';
import '../styles/perfilEspacio.css';
import '../styles/moderacion.css';

const ETIQUETA_TIPO_ORG: Record<string, string> = {
  empresa: 'Empresa',
  institucion_educativa: 'Institución educativa',
  sector_social: 'Sector social',
};

const ETIQUETA_TIPO_CUENTA: Record<string, string> = {
  estudiante: 'Estudiante',
  academico: 'Personal académico',
  empleado_organizacion: 'Empleado de organización',
  organizacion: 'Organización / Representante',
  residente_oaxaca: 'Persona de Oaxaca',
};

const ETIQUETA_CAMPO_AFILIACION: Record<string, string> = {
  account_type: 'Nuevo tipo de cuenta',
  institution: 'Institución',
  campus: 'Campus o plantel',
  field_of_study: 'Carrera o programa',
  semester: 'Semestre',
  organization_id: 'Organización (ID)',
  organization_name: 'Organización',
  organization_position: 'Cargo o puesto',
  organization_area: 'Área',
  reason: 'Motivo del cambio',
};

const formatearFecha = (valor: string) =>
  new Date(valor).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminOrganizaciones() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<PendingOrganization[]>([]);
  const [ownershipRequests, setOwnershipRequests] = useState<PendingOwnershipRequest[]>([]);
  const [affiliations, setAffiliations] = useState<PendingAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedOrganization, setSelectedOrganization] = useState<PendingOrganization | null>(null);
  const [showNewInstitutionForm, setShowNewInstitutionForm] = useState(false);
  const [newInstitution, setNewInstitution] = useState({
    name: '',
    location: '',
    website: '',
    email: '',
    description: '',
  });
  const [creatingInstitution, setCreatingInstitution] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [queue, pendingAffiliations] = await Promise.all([
        getPendingAdminOrganizationQueue(),
        getPendingAffiliations(),
      ]);
      setOrganizations(queue.organizations);
      setOwnershipRequests(queue.ownership_requests);
      setAffiliations(pendingAffiliations);
    } catch {
      setLoadError('No fue posible cargar las solicitudes pendientes. Verifica los permisos y la conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!selectedOrganization) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedOrganization(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedOrganization]);

  async function review(id: number, status: 'approved' | 'rejected') {
    const reason = reasons[`organization-${id}`]?.trim();
    if (status === 'rejected' && !reason) {
      setToast({ tipo: 'error', texto: 'Explica el motivo del rechazo antes de continuar.' });
      return;
    }
    setBusyKey(`org-${id}`);
    try {
      await reviewOrganization(id, status, reason);
      setOrganizations((current) => current.filter((item) => item.id !== id));
      if (selectedOrganization?.id === id) setSelectedOrganization(null);
      setToast({
        tipo: 'exito',
        texto:
          status === 'approved'
            ? 'Organización aprobada correctamente.'
            : 'Solicitud de organización rechazada.',
      });
    } catch {
      setToast({ tipo: 'error', texto: 'No se pudo guardar la decisión. Vuelve a intentarlo.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function reviewOwnership(request: PendingOwnershipRequest, decision: 'approved' | 'rejected') {
    const reason = reasons[`ownership-${request.id}`]?.trim();
    if (decision === 'rejected' && !reason) {
      setToast({ tipo: 'error', texto: 'Explica el motivo del rechazo antes de continuar.' });
      return;
    }
    setBusyKey(`ownership-${request.id}`);
    try {
      await reviewOrganizationMemberRequest(request.organization_id, request.id, decision, reason);
      setOwnershipRequests((current) => current.filter((item) => item.id !== request.id));
      setToast({
        tipo: 'exito',
        texto:
          decision === 'approved'
            ? `Se otorgó la administración de ${request.organization_name} a ${request.user_name}.`
            : 'Solicitud de administración rechazada.',
      });
    } catch {
      setToast({ tipo: 'error', texto: 'No se pudo procesar la solicitud de titularidad.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function reviewUserAffiliation(id: number, decision: 'approved' | 'rejected') {
    const reason = reasons[`profile-${id}`]?.trim();
    if (decision === 'rejected' && !reason) {
      setToast({ tipo: 'error', texto: 'Explica el motivo del rechazo antes de continuar.' });
      return;
    }
    setBusyKey(`profile-${id}`);
    try {
      await reviewAffiliation(id, decision, reason);
      setAffiliations((current) => current.filter((item) => item.id !== id));
      setToast({
        tipo: 'exito',
        texto:
          decision === 'approved'
            ? 'Cambio de afiliación aprobado correctamente.'
            : 'Cambio de afiliación rechazado.',
      });
    } catch {
      setToast({ tipo: 'error', texto: 'No se pudo guardar la revisión de afiliación. Vuelve a intentarlo.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newInstitution.name.trim()) {
      setToast({ tipo: 'error', texto: 'Ingresa el nombre de la institución.' });
      return;
    }
    setCreatingInstitution(true);
    try {
      const created = await adminCreateOrganization({
        name: newInstitution.name.trim(),
        organization_type: 'institucion_educativa',
        sector: 'Educación y capacitación',
        location: newInstitution.location.trim() || undefined,
        website: newInstitution.website.trim() || undefined,
        email: newInstitution.email.trim() || undefined,
        description: newInstitution.description.trim() || undefined,
      });
      setToast({ tipo: 'exito', texto: `Institución verificada agregada: ${created.name}.` });
      setNewInstitution({ name: '', location: '', website: '', email: '', description: '' });
      setShowNewInstitutionForm(false);
      await load();
    } catch {
      setToast({
        tipo: 'error',
        texto: 'No se pudo agregar la institución. Verifica que no exista ya en el catálogo o revisa los datos.',
      });
    } finally {
      setCreatingInstitution(false);
    }
  }

  if (!user?.can_manage_platform) {
    return (
      <div className="pd-pagina">
        <main className="pd-contenedor">
          <p className="pd-error" role="alert">No tienes permisos para administrar ProyectaTec.</p>
          <Link to="/">Volver al inicio</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="pd-pagina">
      <main className="pd-contenedor">
        <header className="pd-encabezado">
          <span className="pd-eyebrow">ADMINISTRACIÓN / ORGANIZACIONES</span>
          <h1>Solicitudes de organización</h1>
          <p>Revisa la información registrada antes de publicar una organización en ProyectaTec.</p>
        </header>

        {loadError && <p className="pd-error" role="alert">{loadError}</p>}

        <section className="pd-tarjeta" style={{ marginBottom: 20 }}>
          <div className="pd-fila-titulo">
            <div>
              <h2>Catálogo de instituciones verificadas</h2>
              <p className="pd-enlace-falso">
                Solo la administración puede dar de alta instituciones verificadas directamente en el menú oficial.
              </p>
            </div>
            <button
              type="button"
              className="pd-boton-claro"
              onClick={() => setShowNewInstitutionForm((open) => !open)}
            >
              {showNewInstitutionForm ? 'Cerrar formulario' : '+ Agregar institución verificada'}
            </button>
          </div>
          {showNewInstitutionForm && (
            <form onSubmit={(event) => void handleCreateInstitution(event)} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              <div className="pd-campo">
                <label htmlFor="admin-inst-name">Nombre oficial de la institución</label>
                <input
                  id="admin-inst-name"
                  required
                  maxLength={255}
                  value={newInstitution.name}
                  onChange={(event) => setNewInstitution((cur) => ({ ...cur, name: event.target.value }))}
                  placeholder="Ej. Universidad Politécnica de Oaxaca"
                />
              </div>
              <div className="pd-campo">
                <label htmlFor="admin-inst-location">Ubicación o municipio (opcional)</label>
                <input
                  id="admin-inst-location"
                  maxLength={255}
                  value={newInstitution.location}
                  onChange={(event) => setNewInstitution((cur) => ({ ...cur, location: event.target.value }))}
                  placeholder="Ej. Oaxaca de Juárez, Oaxaca"
                />
              </div>
              <div className="pd-campo">
                <label htmlFor="admin-inst-website">Sitio web (opcional)</label>
                <input
                  id="admin-inst-website"
                  type="url"
                  maxLength={255}
                  value={newInstitution.website}
                  onChange={(event) => setNewInstitution((cur) => ({ ...cur, website: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="pd-campo">
                <label htmlFor="admin-inst-email">Correo institucional de contacto (opcional)</label>
                <input
                  id="admin-inst-email"
                  type="email"
                  maxLength={255}
                  value={newInstitution.email}
                  onChange={(event) => setNewInstitution((cur) => ({ ...cur, email: event.target.value }))}
                  placeholder="vinculacion@institucion.edu.mx"
                />
              </div>
              <div className="pd-acciones">
                <button className="pd-boton-oscuro" type="submit" disabled={creatingInstitution}>
                  {creatingInstitution ? 'Guardando…' : 'Guardar institución verificada'}
                </button>
              </div>
            </form>
          )}
        </section>

        {loading ? <p className="pd-vacio" aria-live="polite">Cargando solicitudes…</p> : (
          <>
            <section className="pd-columna-derecha" aria-labelledby="pending-organizations-title">
              <h2 id="pending-organizations-title">Organizaciones por aprobar ({organizations.length})</h2>
              {organizations.length === 0 && <p className="pd-vacio">No hay solicitudes de organización pendientes.</p>}
            </section>
            <div className="pd-columna-derecha">
              {organizations.map((organization) => (
                <article className="pd-tarjeta adm-org-card" key={organization.id}>
                  <div className="pd-fila-titulo">
                    <div>
                      <span className="pd-eyebrow">
                        {ETIQUETA_TIPO_ORG[organization.organization_type] ?? organization.organization_type} · {organization.sector || 'Sector no indicado'}
                      </span>
                      <h2 style={{ marginTop: 10 }}>{organization.name}</h2>
                    </div>
                    <span className="pd-boton-deshabilitado">Pendiente</span>
                  </div>
                  <div className="adm-org-meta-lista">
                    <p>{organization.location || 'Ubicación no indicada'}</p>
                    <p>Razón social: {organization.legal_name || 'No indicada'} · Sitio web: {organization.website || 'No indicado'}</p>
                    <p>{organization.email || 'Sin correo de contacto'} · {organization.phone || 'Sin teléfono'}</p>
                    {organization.applicant && (
                      <p className="pd-enlace-falso">
                        Solicitante: {organization.applicant.name} ({organization.applicant.email})
                      </p>
                    )}
                    <p className="pd-enlace-falso">Solicitada: {formatearFecha(organization.created_at)}</p>
                  </div>
                  <div className="pd-campo adm-org-motivo">
                    <label htmlFor={`organization-reason-${organization.id}`}>Motivo si rechazas esta organización</label>
                    <textarea
                      id={`organization-reason-${organization.id}`}
                      maxLength={1000}
                      value={reasons[`organization-${organization.id}`] ?? ''}
                      onChange={(event) => setReasons((current) => ({ ...current, [`organization-${organization.id}`]: event.target.value }))}
                    />
                  </div>
                  <div className="pd-acciones" style={{ marginTop: 6 }}>
                    <button
                      className="pd-boton-claro"
                      type="button"
                      onClick={() => setSelectedOrganization(organization)}
                    >
                      Ver detalle / perfil
                    </button>
                    <button
                      className="pd-boton-claro"
                      type="button"
                      disabled={busyKey === `org-${organization.id}`}
                      onClick={() => void review(organization.id, 'rejected')}
                    >
                      Rechazar
                    </button>
                    <button
                      className="pd-boton-oscuro"
                      type="button"
                      disabled={busyKey === `org-${organization.id}`}
                      onClick={() => void review(organization.id, 'approved')}
                    >
                      {busyKey === `org-${organization.id}` ? 'Guardando…' : 'Aprobar organización'}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {ownershipRequests.length > 0 && (
              <section className="pd-columna-derecha" aria-labelledby="ownership-requests-title" style={{ marginTop: 22 }}>
                <h2 id="ownership-requests-title">Solicitudes de titularidad / dueño ({ownershipRequests.length})</h2>
                {ownershipRequests.map((req) => (
                  <article className="pd-tarjeta adm-org-card" key={`ownership-${req.id}`}>
                    <div className="pd-fila-titulo">
                      <div>
                        <span className="pd-eyebrow">
                          {ETIQUETA_TIPO_ORG[req.organization_type] ?? req.organization_type}
                        </span>
                        <h2 style={{ marginTop: 10 }}>{req.organization_name}</h2>
                        <p style={{ marginTop: 6 }}>{req.user_name} ({req.user_email}) solicita ser administrador/dueño</p>
                      </div>
                      <span className="pd-boton-deshabilitado">Pendiente</span>
                    </div>
                    {req.request_note && <p style={{ margin: 0 }}>Motivo: {req.request_note}</p>}
                    <div className="pd-campo adm-org-motivo">
                      <label htmlFor={`ownership-reason-${req.id}`}>Motivo si rechazas esta solicitud</label>
                      <textarea
                        id={`ownership-reason-${req.id}`}
                        maxLength={500}
                        value={reasons[`ownership-${req.id}`] ?? ''}
                        onChange={(event) => setReasons((current) => ({ ...current, [`ownership-${req.id}`]: event.target.value }))}
                      />
                    </div>
                    <div className="pd-acciones" style={{ marginTop: 6 }}>
                      <button
                        className="pd-boton-claro"
                        type="button"
                        disabled={busyKey === `ownership-${req.id}`}
                        onClick={() => void reviewOwnership(req, 'rejected')}
                      >
                        Rechazar
                      </button>
                      <button
                        className="pd-boton-oscuro"
                        type="button"
                        disabled={busyKey === `ownership-${req.id}`}
                        onClick={() => void reviewOwnership(req, 'approved')}
                      >
                        {busyKey === `ownership-${req.id}` ? 'Guardando…' : 'Aprobar como dueño'}
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="pd-columna-derecha" aria-labelledby="pending-affiliations-title" style={{ marginTop: 22 }}>
              <h2 id="pending-affiliations-title">Cambios de afiliación por revisar ({affiliations.length})</h2>
              {affiliations.length === 0 && <p className="pd-vacio">No hay cambios pendientes de institución u organización.</p>}
              {affiliations.map((request) => (
                <article className="pd-tarjeta adm-org-card" key={request.id}>
                  <div className="pd-fila-titulo">
                    <div>
                      <h2>{request.user_name}</h2>
                      <p style={{ marginTop: 6 }}>
                        {request.user_email} · Actual: {ETIQUETA_TIPO_CUENTA[request.account_type] ?? request.account_type}
                        {request.current_institution
                          ? ` · ${request.current_institution}`
                          : request.current_organization_name
                            ? ` · ${request.current_organization_name}`
                            : ''}
                      </p>
                    </div>
                    <span className="pd-boton-deshabilitado">Pendiente</span>
                  </div>
                  <dl style={{ margin: 0 }}>
                    {Object.entries(request.pending_affiliation).map(([field, value]) => (
                      <div className="pd-info-detalle" key={field}>
                        <dt>{ETIQUETA_CAMPO_AFILIACION[field] ?? field.replaceAll('_', ' ')}</dt>
                        <dd>{field === 'account_type' && typeof value === 'string' ? (ETIQUETA_TIPO_CUENTA[value] ?? value) : (value || '—')}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="pd-campo adm-org-motivo">
                    <label htmlFor={`profile-reason-${request.id}`}>Motivo si rechazas este cambio</label>
                    <textarea
                      id={`profile-reason-${request.id}`}
                      maxLength={1000}
                      value={reasons[`profile-${request.id}`] ?? ''}
                      onChange={(event) => setReasons((current) => ({ ...current, [`profile-${request.id}`]: event.target.value }))}
                    />
                  </div>
                  <div className="pd-acciones">
                    <button
                      className="pd-boton-claro"
                      type="button"
                      disabled={busyKey === `profile-${request.id}`}
                      onClick={() => void reviewUserAffiliation(request.id, 'rejected')}
                    >
                      Rechazar cambio
                    </button>
                    <button
                      className="pd-boton-oscuro"
                      type="button"
                      disabled={busyKey === `profile-${request.id}`}
                      onClick={() => void reviewUserAffiliation(request.id, 'approved')}
                    >
                      {busyKey === `profile-${request.id}` ? 'Guardando…' : 'Aprobar cambio'}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>

      {selectedOrganization && (
        <div
          className="mod-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedOrganization(null);
          }}
        >
          <div
            className="mod-dialogo-detalle"
            role="dialog"
            aria-modal="true"
            aria-labelledby="org-detalle-titulo"
          >
            <div className="mod-modal-cabecera">
              <div>
                <span className="pd-eyebrow">
                  {ETIQUETA_TIPO_ORG[selectedOrganization.organization_type] ?? selectedOrganization.organization_type}
                  {selectedOrganization.sector ? ` · ${selectedOrganization.sector}` : ''}
                </span>
                <h2 id="org-detalle-titulo">{selectedOrganization.name}</h2>
                <span className="mod-etiqueta mod-etiqueta-alerta">Pendiente de aprobación</span>
              </div>
              <button
                type="button"
                className="mod-modal-cerrar"
                onClick={() => setSelectedOrganization(null)}
                aria-label="Cerrar detalle"
              >
                ×
              </button>
            </div>

            <div className="mod-detalle-grid">
              <div className="mod-detalle-item">
                <span>Razón social</span>
                <strong>{selectedOrganization.legal_name || 'No indicada'}</strong>
              </div>
              <div className="mod-detalle-item">
                <span>Ubicación</span>
                <strong>{selectedOrganization.location || 'No indicada'}</strong>
              </div>
              <div className="mod-detalle-item">
                <span>Correo de contacto</span>
                <strong>{selectedOrganization.email || 'No indicado'}</strong>
              </div>
              <div className="mod-detalle-item">
                <span>Teléfono</span>
                <strong>{selectedOrganization.phone || 'No indicado'}</strong>
              </div>
              <div className="mod-detalle-item">
                <span>Sitio web</span>
                {selectedOrganization.website ? (
                  <a href={selectedOrganization.website} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#0f4c5c' }}>
                    {selectedOrganization.website}
                  </a>
                ) : (
                  <strong>No indicado</strong>
                )}
              </div>
              <div className="mod-detalle-item">
                <span>Fecha de solicitud</span>
                <strong>{formatearFecha(selectedOrganization.created_at)}</strong>
              </div>
            </div>

            {selectedOrganization.applicant && (
              <div className="mod-detalle-seccion">
                <h3>Solicitante / representante</h3>
                <div className="mod-subitem">
                  <div>
                    <strong>{selectedOrganization.applicant.name}</strong>
                    <div className="pd-enlace-falso">{selectedOrganization.applicant.email}</div>
                  </div>
                  <span className="mod-etiqueta">
                    {ETIQUETA_TIPO_CUENTA[selectedOrganization.applicant.account_type] ?? selectedOrganization.applicant.account_type}
                  </span>
                </div>
              </div>
            )}

            <div className="mod-detalle-seccion">
              <h3>Descripción de la organización</h3>
              <p className="mod-detalle-texto">
                {selectedOrganization.description?.trim() || 'Sin descripción registrada.'}
              </p>
            </div>

            <div className="mod-detalle-seccion">
              <div className="pd-campo">
                <label htmlFor={`modal-org-reason-${selectedOrganization.id}`}>Motivo si rechazas esta organización</label>
                <textarea
                  id={`modal-org-reason-${selectedOrganization.id}`}
                  maxLength={1000}
                  value={reasons[`organization-${selectedOrganization.id}`] ?? ''}
                  onChange={(event) =>
                    setReasons((current) => ({
                      ...current,
                      [`organization-${selectedOrganization.id}`]: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="pd-acciones">
                <button
                  type="button"
                  className="pd-boton-claro"
                  onClick={() => setSelectedOrganization(null)}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="pd-boton-claro"
                  disabled={busyKey === `org-${selectedOrganization.id}`}
                  onClick={() => void review(selectedOrganization.id, 'rejected')}
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  className="pd-boton-oscuro"
                  disabled={busyKey === `org-${selectedOrganization.id}`}
                  onClick={() => void review(selectedOrganization.id, 'approved')}
                >
                  {busyKey === `org-${selectedOrganization.id}` ? 'Guardando…' : 'Aprobar organización'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
