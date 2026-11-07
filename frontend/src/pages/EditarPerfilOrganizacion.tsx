import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getMyOrganizations,
  resubmitOrganization,
  updateOrganizationProfile,
  type OrganizationAccess,
} from '../api/profileService';
import '../styles/perfilEspacio.css';

type ApiError = {
  message?: string;
  errors?: Record<string, string[]>;
};

export default function EditarPerfilOrganizacion() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(params.get('id'));
  const validId = Number.isSafeInteger(id) && id > 0;
  const [organization, setOrganization] = useState<OrganizationAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [values, setValues] = useState({
    name: '', legal_name: '', website: '', description: '', location: '', sector: '', email: '', phone: '', public_fields: [] as string[],
  });

  useEffect(() => {
    let active = true;
    if (!validId) return () => { active = false; };

    void getMyOrganizations()
      .then((organizations) => {
        if (!active) return;
        const current = organizations.find((item) => item.id === id);
        if (!current) {
          setMessage('La organización no está vinculada a tu cuenta o no se encuentra activa.');
          return;
        }
        setOrganization(current);
        setValues({
          name: current.name,
          legal_name: current.legal_name ?? '',
          website: current.website ?? '',
          description: current.description ?? '',
          location: current.location ?? '',
          sector: current.sector ?? '',
          email: current.email ?? '',
          phone: current.phone ?? '',
          public_fields: current.public_fields ?? [],
        });
        if (!current.can_update) setMessage('Tu membresía no tiene permiso para editar esta organización.');
      })
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          navigate('/acceso', { replace: true });
          return;
        }
        if (active) setMessage('No se pudo cargar la organización. Intenta nuevamente.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id, navigate, validId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization?.can_update) return;
    setSaving(true);
    setMessage('');
    setErrors({});

    try {
      await updateOrganizationProfile(organization.id, values);
      setOrganization((current) => current ? { ...current, ...values } : current);
      setMessage('Los cambios se guardaron correctamente.');
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiError>(error)) {
        const status = error.response?.status;
        if (status === 401) {
          navigate('/acceso', { replace: true });
          return;
        }
        if (status === 403) {
          setOrganization((current) => current ? { ...current, can_update: false } : current);
          setMessage('El servidor rechazó la edición por falta de permisos.');
          return;
        }
        if (status === 422) {
          setErrors(error.response?.data?.errors ?? {});
          setMessage('Revisa los campos indicados.');
          return;
        }
        setMessage(error.response?.data?.message ?? 'No se pudieron guardar los cambios.');
      } else {
        setMessage('Error de conexión con el servidor. Verifica tu red.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResubmit() {
    if (!organization) return;
    setSaving(true);
    setMessage('');
    try {
      await resubmitOrganization(organization.id);
      setOrganization((current) => current && { ...current, approval_status: 'pending', rejection_reason: null });
      setMessage('La organización volvió a quedar pendiente de aprobación.');
    } catch {
      setMessage('No se pudo reenviar la organización. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const backToProfile = `/mi-perfil?tipo=organizacion&id=${id}`;

  if (!validId) {
    return <div className="pd-pagina"><main className="pd-contenedor"><p className="pd-error" role="alert">Selecciona una organización válida desde Mi perfil.</p><Link to="/mi-perfil?tipo=organizacion">Volver a Mi perfil</Link></main></div>;
  }

  if (loading) {
    return <div className="pd-pagina"><main className="pd-contenedor" aria-live="polite"><p className="pd-vacio">Cargando organización…</p></main></div>;
  }

  return (
    <div className="pd-pagina">
      <main className="pd-contenedor">
        <header className="pd-encabezado">
          <span className="pd-eyebrow">MI ESPACIO / ORGANIZACIÓN</span>
          <h1>Editar organización</h1>
          <p>Actualiza la información pública de {organization?.name ?? 'la organización'}.</p>
        </header>

        <div className="pd-editar-grid">
          <section className="pd-tarjeta pd-form-card" aria-labelledby="organization-form-title">
            <h2 id="organization-form-title">Datos de la organización</h2>
            {message && (
              <p className={message.includes('correctamente') ? 'pd-exito' : 'pd-error'} role="status" aria-live="polite">
                {message}
              </p>
            )}
            {organization?.approval_status === 'rejected' && (
              <p role="status" className="pd-error">Motivo del rechazo: {organization.rejection_reason || 'No indicado'}. Guarda primero las correcciones y vuelve a enviar la solicitud.</p>
            )}
            {organization?.can_update ? (
              <form onSubmit={handleSubmit}>
                <div className="pd-campo">
                  <label htmlFor="organization-name">Nombre o razón social</label>
                  <input
                    id="organization-name"
                    value={values.name}
                    onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                    required
                    maxLength={255}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'organization-name-error' : undefined}
                  />
                  {errors.name && <p className="pd-error" id="organization-name-error">{errors.name[0]}</p>}
                </div>
                <div className="pd-campo"><label htmlFor="organization-legal-name">Razón social legal</label><input id="organization-legal-name" value={values.legal_name} maxLength={255} onChange={(event) => setValues((current) => ({ ...current, legal_name: event.target.value }))} /></div>
                <div className="pd-campo"><label htmlFor="organization-website">Sitio web</label><input id="organization-website" type="url" value={values.website} maxLength={255} onChange={(event) => setValues((current) => ({ ...current, website: event.target.value }))} /></div>
                <div className="pd-campo">
                  <label htmlFor="organization-description">Descripción</label>
                  <textarea
                    id="organization-description"
                    rows={4}
                    value={values.description}
                    onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? 'organization-description-error' : undefined}
                  />
                  {errors.description && <p className="pd-error" id="organization-description-error">{errors.description[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-location">Ubicación</label>
                  <input
                    id="organization-location"
                    value={values.location}
                    onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))}
                    maxLength={255}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={errors.location ? 'organization-location-error' : undefined}
                  />
                  {errors.location && <p className="pd-error" id="organization-location-error">{errors.location[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-sector">Sector o actividad</label>
                  <input id="organization-sector" value={values.sector} maxLength={255} onChange={(event) => setValues((current) => ({ ...current, sector: event.target.value }))} aria-invalid={Boolean(errors.sector)} />
                  {errors.sector && <p className="pd-error">{errors.sector[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-email">Correo de contacto</label>
                  <input id="organization-email" type="email" value={values.email} maxLength={255} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} aria-invalid={Boolean(errors.email)} />
                  {errors.email && <p className="pd-error">{errors.email[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-phone">Teléfono de contacto</label>
                  <input id="organization-phone" type="tel" value={values.phone} maxLength={20} onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))} aria-invalid={Boolean(errors.phone)} />
                  {errors.phone && <p className="pd-error">{errors.phone[0]}</p>}
                </div>
                <fieldset className="pd-campo">
                  <legend>Datos públicos de la organización</legend>
                  {([['location', 'Ubicación'], ['classification', 'Tipo y sector'], ['email', 'Correo de contacto'], ['phone', 'Teléfono']] as const).map(([field, label]) => (
                    <label className="pd-casilla" key={field}>
                      <input type="checkbox" checked={values.public_fields.includes(field)} onChange={(event) => setValues((current) => ({ ...current, public_fields: event.target.checked
                        ? [...current.public_fields, field]
                        : current.public_fields.filter((item) => item !== field) }))} />
                      Mostrar {label.toLocaleLowerCase()}
                    </label>
                  ))}
                </fieldset>
                <div className="pd-acciones">
                  <Link className="pd-boton-claro" to={backToProfile}>Cancelar</Link>
                  <button className="pd-boton-oscuro" type="submit" disabled={saving || !values.name.trim()}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  {organization.approval_status === 'rejected' && (
                    <button className="pd-boton-claro" type="button" disabled={saving} onClick={() => void handleResubmit()}>Solicitar nueva revisión</button>
                  )}
                </div>
              </form>
            ) : (
              <Link className="pd-boton-claro" to={backToProfile}>Volver a Mi perfil</Link>
            )}
          </section>

          <aside className="pd-tarjeta pd-editar-aside">
            <h2>Permisos de edición</h2>
            <p>
              {organization?.can_update
                ? 'Tu membresía activa de administrador puede actualizar el nombre, la descripción y la ubicación.'
                : 'Solo una persona administradora con membresía activa puede editar esta organización.'}
            </p>
            <p className="pd-ayuda">Tipo de cuenta: {organization?.organization_type ?? '—'} · Rol: {organization?.role ?? '—'}</p>
          </aside>
        </div>
        <footer className="pd-footer"><span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span><span>Privacidad · Ayuda</span></footer>
      </main>
    </div>
  );
}
