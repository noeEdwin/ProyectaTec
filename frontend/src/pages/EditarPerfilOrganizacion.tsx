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
import { MUNICIPIOS_OAXACA } from '../data/municipiosOaxaca';
import {
  SECTORES, REGLAS_CAMPO, filtrarCampo, opcionesConActual, separarUbicacionOaxaca, ubicacionOaxaca, validarCampo,
} from '../utils/camposPerfil';
import '../styles/perfilEspacio.css';
import '../styles/editarOrganizacion.css';

type ApiError = {
  message?: string;
  errors?: Record<string, string[]>;
};

type Aviso = { tipo: 'exito' | 'error'; texto: string };

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditarPerfilOrganizacion() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(params.get('id'));
  const validId = Number.isSafeInteger(id) && id > 0;
  const [organization, setOrganization] = useState<OrganizationAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [values, setValues] = useState({
    name: '', legal_name: '', website: '', description: '', sector: '', email: '', phone: '', public_fields: [] as string[],
  });
  const [municipio, setMunicipio] = useState('');
  const [colonia, setColonia] = useState('');

  function mostrarAviso(tipo: Aviso['tipo'], texto: string) {
    setAviso({ tipo, texto });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    let active = true;
    if (!validId) return () => { active = false; };

    void getMyOrganizations()
      .then((organizations) => {
        if (!active) return;
        const current = organizations.find((item) => item.id === id);
        if (!current) {
          setAviso({ tipo: 'error', texto: 'La organización no está vinculada a tu cuenta o no se encuentra activa.' });
          return;
        }
        setOrganization(current);
        setValues({
          name: current.name,
          legal_name: current.legal_name ?? '',
          website: current.website ?? '',
          description: current.description ?? '',
          sector: current.sector ?? '',
          email: current.email ?? '',
          phone: current.phone ?? '',
          public_fields: current.public_fields ?? [],
        });
        const ubicacion = separarUbicacionOaxaca(current.location ?? '', MUNICIPIOS_OAXACA);
        setMunicipio(ubicacion.municipio);
        setColonia(ubicacion.colonia);
        if (!current.can_update) setAviso({ tipo: 'error', texto: 'Tu membresía no tiene permiso para editar esta organización.' });
      })
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          navigate('/acceso', { replace: true });
          return;
        }
        if (active) setAviso({ tipo: 'error', texto: 'No se pudo cargar la organización. Intenta nuevamente.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id, navigate, validId]);

  function cambiar(campo: keyof typeof values, valor: string) {
    setValues((current) => ({ ...current, [campo]: filtrarCampo(campo, valor) }));
    setErrors((current) => {
      if (!current[campo]) return current;
      const resto = { ...current };
      delete resto[campo];
      return resto;
    });
  }

  function validarLocal(): Record<string, string[]> {
    const nuevos: Record<string, string[]> = {};
    const telefono = validarCampo('phone', values.phone);
    if (telefono) nuevos.phone = [telefono];
    if (values.email && !CORREO_RE.test(values.email.trim())) nuevos.email = ['Ingresa un correo de contacto válido.'];
    if (!municipio) nuevos.location = ['Selecciona el municipio.'];
    else if (!colonia.trim()) nuevos.location = ['Escribe la colonia, barrio o comunidad.'];
    else {
      const colMsg = validarCampo('locality', colonia);
      if (colMsg) nuevos.location = [colMsg];
    }
    return nuevos;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization?.can_update) return;

    const erroresLocales = validarLocal();
    if (Object.keys(erroresLocales).length > 0) {
      setErrors(erroresLocales);
      mostrarAviso('error', 'Revisa los campos indicados.');
      return;
    }

    setSaving(true);
    setAviso(null);
    setErrors({});

    const datos = { ...values, location: ubicacionOaxaca(municipio, colonia) };

    try {
      await updateOrganizationProfile(organization.id, datos);
      setOrganization((current) => current ? { ...current, ...datos } : current);
      mostrarAviso('exito', 'Los cambios se guardaron correctamente.');
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiError>(error)) {
        const status = error.response?.status;
        if (status === 401) {
          navigate('/acceso', { replace: true });
          return;
        }
        if (status === 403) {
          setOrganization((current) => current ? { ...current, can_update: false } : current);
          mostrarAviso('error', 'El servidor rechazó la edición por falta de permisos.');
          return;
        }
        if (status === 422) {
          setErrors(error.response?.data?.errors ?? {});
          mostrarAviso('error', 'Revisa los campos indicados.');
          return;
        }
        mostrarAviso('error', error.response?.data?.message ?? 'No se pudieron guardar los cambios.');
      } else {
        mostrarAviso('error', 'Error de conexión con el servidor. Verifica tu red.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResubmit() {
    if (!organization) return;
    setSaving(true);
    setAviso(null);
    try {
      await resubmitOrganization(organization.id);
      setOrganization((current) => current && { ...current, approval_status: 'pending', rejection_reason: null });
      mostrarAviso('exito', 'La organización volvió a quedar pendiente de aprobación.');
    } catch {
      mostrarAviso('error', 'No se pudo reenviar la organización. Intenta de nuevo.');
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

        {aviso && (
          <p
            className={`eo-aviso ${aviso.tipo === 'exito' ? 'eo-aviso-exito' : 'eo-aviso-error'}`}
            role={aviso.tipo === 'exito' ? 'status' : 'alert'}
          >
            {aviso.texto}
          </p>
        )}

        <div className="pd-editar-grid">
          <section className="pd-tarjeta pd-form-card" aria-labelledby="organization-form-title">
            <h2 id="organization-form-title">Datos de la organización</h2>
            {organization?.approval_status === 'rejected' && (
              <p role="status" className="eo-aviso eo-aviso-error">Motivo del rechazo: {organization.rejection_reason || 'No indicado'}. Guarda primero las correcciones y vuelve a enviar la solicitud.</p>
            )}
            {organization?.can_update ? (
              <form onSubmit={handleSubmit} noValidate>
                <div className="pd-campo">
                  <label htmlFor="organization-name">Nombre o razón social</label>
                  <input
                    id="organization-name"
                    value={values.name}
                    onChange={(event) => cambiar('name', event.target.value)}
                    required
                    maxLength={255}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'organization-name-error' : undefined}
                  />
                  {errors.name && <p className="pd-error" id="organization-name-error">{errors.name[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-legal-name">Razón social legal</label>
                  <input id="organization-legal-name" value={values.legal_name} maxLength={255} onChange={(event) => cambiar('legal_name', event.target.value)} />
                  {errors.legal_name && <p className="pd-error">{errors.legal_name[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-website">Sitio web</label>
                  <input id="organization-website" type="url" value={values.website} maxLength={255} placeholder="https://ejemplo.org" onChange={(event) => cambiar('website', event.target.value)} />
                  {errors.website && <p className="pd-error">{errors.website[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-description">Descripción</label>
                  <textarea
                    id="organization-description"
                    rows={4}
                    value={values.description}
                    onChange={(event) => cambiar('description', event.target.value)}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? 'organization-description-error' : undefined}
                  />
                  {errors.description && <p className="pd-error" id="organization-description-error">{errors.description[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-municipality">Municipio</label>
                  <select
                    id="organization-municipality"
                    value={municipio}
                    onChange={(event) => { setMunicipio(event.target.value); setErrors((c) => { const r = { ...c }; delete r.location; return r; }); }}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={errors.location ? 'organization-location-error' : undefined}
                  >
                    <option value="">Selecciona el municipio</option>
                    {opcionesConActual(MUNICIPIOS_OAXACA, municipio).map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-locality">Barrio, colonia o comunidad</label>
                  <input
                    id="organization-locality"
                    value={colonia}
                    onChange={(event) => { setColonia(filtrarCampo('locality', event.target.value)); setErrors((c) => { const r = { ...c }; delete r.location; return r; }); }}
                    maxLength={255}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={errors.location ? 'organization-location-error' : undefined}
                  />
                  {errors.location && <p className="pd-error" id="organization-location-error">{errors.location[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-sector">Sector o actividad</label>
                  <select id="organization-sector" value={values.sector} onChange={(event) => cambiar('sector', event.target.value)} aria-invalid={Boolean(errors.sector)}>
                    <option value="">Selecciona un sector</option>
                    {opcionesConActual(SECTORES, values.sector).map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  {errors.sector && <p className="pd-error">{errors.sector[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-email">Correo de contacto</label>
                  <input id="organization-email" type="email" value={values.email} maxLength={255} onChange={(event) => cambiar('email', event.target.value)} aria-invalid={Boolean(errors.email)} />
                  {errors.email && <p className="pd-error">{errors.email[0]}</p>}
                </div>
                <div className="pd-campo">
                  <label htmlFor="organization-phone">Teléfono de contacto</label>
                  <input id="organization-phone" type="tel" inputMode="numeric" placeholder="9511234567" value={values.phone} maxLength={REGLAS_CAMPO.phone.maxLength} onChange={(event) => cambiar('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} />
                  {errors.phone && <p className="pd-error">{errors.phone[0]}</p>}
                </div>

                <fieldset className="eo-publicos">
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

                <div className="eo-acciones">
                  <Link className="pd-boton-claro" to={backToProfile}>Cancelar</Link>
                  {organization.approval_status === 'rejected' && (
                    <button className="pd-boton-claro" type="button" disabled={saving} onClick={() => void handleResubmit()}>Solicitar nueva revisión</button>
                  )}
                  <button className="pd-boton-oscuro" type="submit" disabled={saving || !values.name.trim()}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
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