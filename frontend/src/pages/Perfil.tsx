import { useCallback, useState, useEffect } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getMyProfile, getOrganizationCatalog, updateMyProfile, type OrganizationCatalogItem, type UserProfile } from '../api/profileService';
import { useAuth } from '../context/auth-context';
import { traducirErrorCorreo } from '../utils/Correo';
import AreasInteresSelector from '../components/perfiles/AreasInteresSelector';
import SelectorUbicacion from '../components/perfiles/SelectorUbicacion';
import { MUNICIPIOS_OAXACA } from '../data/municipiosOaxaca';
import {
  REGLAS_CAMPO, SEMESTRES, filtrarCampo, opcionesConActual, validarCampo, ubicacionOaxaca, separarUbicacionOaxaca,
} from '../utils/camposPerfil';

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

const accountTypeOptions = [
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'academico', label: 'Personal académico (docente o investigador)' },
  { value: 'empleado_organizacion', label: 'Empleado de una organización' },
  { value: 'residente_oaxaca', label: 'Persona de Oaxaca' },
];

const estiloLabel: CSSProperties = { display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' };
const estiloInput: CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

// Campos que se validan según el tipo de cuenta (además del teléfono).
const CAMPOS_A_VALIDAR: Record<string, string[]> = {
  estudiante: ['campus', 'field_of_study', 'student_number'],
  academico: ['organization_area', 'organization_position'],
  empleado_organizacion: ['organization_area', 'organization_position'],
  residente_oaxaca: ['locality'],
};

function Campo({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} style={estiloLabel}>{label}</label>
      {children}
      {error && <span role="alert" style={{ color: '#b91c1c', fontSize: '12px', marginTop: '4px', display: 'block' }}>{error}</span>}
    </div>
  );
}

function normalizeAccountType(type?: string): string {
  if (['student', 'estudiante'].includes(type ?? '')) return 'estudiante';
  if (['docente', 'investigador', 'academico', 'Investigador'].includes(type ?? '')) return 'academico';
  if (['employee', 'empleado_organizacion'].includes(type ?? '')) return 'empleado_organizacion';
  if (['resident', 'residente_oaxaca'].includes(type ?? '')) return 'residente_oaxaca';
  return type ?? 'estudiante';
}

export default function Perfil() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile>({
    display_name: '',
    description: '',
    phone: '',
    location: '',
    institution: '',
    field_of_study: '',
    interest_areas: [],
    account_type: 'estudiante',
    email: '',
    campus: '',
    semester: '',
    student_number: '',
    expected_graduation: '',
    academic_role: '',
    organization_name: '',
    organization_area: '',
    organization_position: '',
    municipality: '',
    locality: '',
    public_fields: [],
    affiliation_status: 'current',
    pending_affiliation: null,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [catalog, setCatalog] = useState<OrganizationCatalogItem[]>([]);

  useEffect(() => {
    void getOrganizationCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const handleApiError = useCallback((error: unknown) => {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
      setErrorMessage('Error de conexión con el servidor. Verifica tu red.');
      return;
    }

    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 401:
        navigate('/acceso');
        break;
      case 403:
        setErrorMessage('No tienes permisos para modificar este perfil.');
        break;
      case 404:
        setErrorMessage('El perfil solicitado no fue encontrado.');
        break;
      case 422:
        setValidationErrors({
          ...data?.errors,
          ...(data?.errors?.email ? { email: [traducirErrorCorreo(data.errors.email[0]) || data.errors.email[0]] } : {}),
        });
        setErrorMessage('Por favor corrige los campos indicados.');
        break;
      default:
        setErrorMessage(data?.message || 'Ocurrió un error inesperado.');
    }
  }, [navigate]);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMyProfile();
      if (['organizacion', 'organization', 'empresa', 'institucion_educativa', 'sector_social'].includes(data.account_type ?? user?.account_type ?? '')) {
        navigate('/mi-perfil?tipo=organizacion', { replace: true });
        return;
      }
      setProfile({
        display_name: data.display_name || user?.name || '',
        description: data.description || '',
        phone: data.phone || '',
        location: data.location || '',
        institution: data.institution || '',
        field_of_study: data.field_of_study || '',
        interest_areas: data.interest_areas || [],
        account_type: normalizeAccountType(data.account_type || user?.account_type),
        email: data.email || user?.email || '',
        campus: data.campus || '',
        semester: data.semester || '',
        student_number: data.student_number || '',
        expected_graduation: data.expected_graduation || '',
        academic_role: data.academic_role || '',
        organization_name: data.organization_name || '',
        organization_id: data.organization_id ?? null,
        organization_area: data.organization_area || '',
        organization_position: data.organization_position || '',
        municipality: data.municipality || separarUbicacionOaxaca(data.location || '', MUNICIPIOS_OAXACA).municipio,
        locality: data.locality || separarUbicacionOaxaca(data.location || '', MUNICIPIOS_OAXACA).colonia,
        public_fields: data.public_fields || [],
        affiliation_status: data.affiliation_status || 'current',
        affiliation_rejection_reason: data.affiliation_rejection_reason || null,
        pending_affiliation: data.pending_affiliation || null,
      });
    } catch (error: unknown) {
      // Si el perfil no existe en PostgreSQL (404), inicializamos el formulario como perfil nuevo
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setProfile({
          display_name: user?.name || '',
          description: '',
          phone: '',
          location: '',
          institution: '',
          field_of_study: '',
          account_type: normalizeAccountType(user?.account_type),
          email: user?.email || '',
        });
        setErrorMessage(null); // No mostramos error porque es un usuario nuevo
      } else {
        handleApiError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [handleApiError, navigate, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProfileData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchProfileData]);

  const esResidente = profile.account_type === 'residente_oaxaca';

  const setField = (key: string, value: string) => {
    setProfile((current) => ({ ...current, [key]: filtrarCampo(key, value) }));
    setValidationErrors((current) => {
      if (!current[key]) return current;
      const resto = { ...current };
      delete resto[key];
      return resto;
    });
  };

  const errorDe = (key: string) => validationErrors[key]?.[0];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const erroresLocales: Record<string, string[]> = {};
    for (const clave of ['phone', ...(CAMPOS_A_VALIDAR[profile.account_type ?? ''] ?? [])]) {
      const mensaje = validarCampo(clave, String(profile[clave as keyof UserProfile] ?? ''));
      if (mensaje) erroresLocales[clave] = [mensaje];
    }
    if (Object.keys(erroresLocales).length > 0) {
      setValidationErrors(erroresLocales);
      setErrorMessage('Por favor corrige los campos indicados.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationErrors({});

    try {
      const res = await updateMyProfile({
        display_name: profile.display_name,
        email: profile.email,
        account_type: profile.account_type,
        description: profile.description,
        phone: profile.phone,
        location: esResidente
          ? ubicacionOaxaca(profile.municipality ?? '', profile.locality ?? '')
          : profile.location,
        institution: profile.institution,
        field_of_study: profile.field_of_study,
        interest_areas: profile.interest_areas,
        campus: profile.campus,
        semester: profile.semester,
        student_number: profile.student_number,
        expected_graduation: profile.expected_graduation,
        academic_role: profile.academic_role,
        organization_name: profile.organization_name,
        organization_id: profile.organization_id,
        organization_area: profile.organization_area,
        organization_position: profile.organization_position,
        municipality: profile.municipality,
        locality: profile.locality,
        public_fields: profile.public_fields,
      });
      if (res) {
        setProfile((current) => ({ ...current, ...res }));
        setSuccessMessage(res.affiliation_status === 'pending'
          ? 'La solicitud de cambio de institución u organización quedó pendiente de revisión. Los datos actuales siguen activos.'
          : '¡Perfil guardado exitosamente!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: unknown) {
      handleApiError(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
        Cargando datos del perfil...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1140px', margin: '2.5rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif' }}>

      {/* Encabezado e Identidad ProyectaTec */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-block',
          borderBottom: '3px solid #f59e0b',
          paddingBottom: '2px',
          marginBottom: '0.75rem'
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#b45309',
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}>
            PROYECTATEC / EDITAR PERFIL
          </span>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Editar perfil
        </h1>

        <p style={{ fontSize: '16px', color: '#64748b', marginTop: '0.5rem' }}>
          Actualiza los datos que verán otros participantes de ProyectaTec.
        </p>
      </div>

      {/* Retroalimentación de API */}
      {errorMessage && (
        <div style={{
          background: '#fee2e2', color: '#b91c1c', padding: '0.875rem 1.25rem',
          borderRadius: '10px', marginBottom: '1.5rem', fontSize: '14px', fontWeight: 500
        }}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{
          background: '#dcfce7', color: '#15803d', padding: '0.875rem 1.25rem',
          borderRadius: '10px', marginBottom: '1.5rem', fontSize: '14px', fontWeight: 500
        }}>
          {successMessage}
        </div>
      )}

      {/* Grid de 2 Columnas (Figma Layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>

        {/* Tarjeta Izquierda: Formulario */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem' }}>
            Datos de tu perfil
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Nombre o razón social */}
            <div>
              <label htmlFor="profile-display-name" style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Nombre o razón social
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Centro de Innovación Oaxaca"
                required
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {validationErrors.display_name && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {validationErrors.display_name[0]}
                </span>
              )}
            </div>

            {/* Tipo de cuenta */}
            <div>
              <label htmlFor="profile-account-type" style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Tipo de cuenta
              </label>
              <select
                id="profile-account-type"
                value={profile.account_type || ''}
                onChange={(e) => setProfile({ ...profile, account_type: e.target.value })}
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                {accountTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            {profile.account_type === 'estudiante' && <>
              <Campo id="profile-institution" label="Institución educativa" error={errorDe('institution')}>
                <input id="profile-institution" list="profile-institution-list" value={profile.institution || ''} onChange={(e) => setField('institution', e.target.value)} required maxLength={255} style={estiloInput} />
                <datalist id="profile-institution-list">{catalog.filter((item) => item.organization_type === 'institucion_educativa').map((item) => <option key={item.id} value={item.name} />)}</datalist>
              </Campo>
              <Campo id="profile-campus" label="Campus o plantel" error={errorDe('campus')}>
                <input id="profile-campus" value={profile.campus || ''} onChange={(e) => setField('campus', e.target.value)} required maxLength={255} style={estiloInput} />
              </Campo>
              <Campo id="profile-field-of-study" label="Carrera o programa" error={errorDe('field_of_study')}>
                <input id="profile-field-of-study" value={profile.field_of_study || ''} onChange={(e) => setField('field_of_study', e.target.value)} required maxLength={255} style={estiloInput} />
              </Campo>
              <Campo id="profile-semester" label="Semestre o periodo" error={errorDe('semester')}>
                <select id="profile-semester" value={profile.semester || ''} onChange={(e) => setField('semester', e.target.value)} required style={estiloInput}>
                  <option value="">Selecciona tu semestre</option>
                  {SEMESTRES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  {profile.semester && !SEMESTRES.some((item) => item.value === profile.semester) && <option value={profile.semester}>{profile.semester}</option>}
                </select>
              </Campo>
              <Campo id="profile-student-number" label="Matrícula" error={errorDe('student_number')}>
                <input id="profile-student-number" inputMode="numeric" value={profile.student_number || ''} onChange={(e) => setField('student_number', e.target.value)} required maxLength={REGLAS_CAMPO.student_number.maxLength} style={estiloInput} />
              </Campo>
              <Campo id="profile-expected-graduation" label="Fecha estimada de egreso" error={errorDe('expected_graduation')}>
                <input id="profile-expected-graduation" type="month" value={profile.expected_graduation || ''} onChange={(e) => setField('expected_graduation', e.target.value)} required style={estiloInput} />
              </Campo>
            </>}

            {profile.account_type === 'academico' && <>
              <Campo id="profile-institution" label="Institución" error={errorDe('institution')}>
                <input id="profile-institution" list="profile-institution-list" value={profile.institution || ''} onChange={(e) => setField('institution', e.target.value)} required maxLength={255} style={estiloInput} />
                <datalist id="profile-institution-list">{catalog.filter((item) => item.organization_type === 'institucion_educativa').map((item) => <option key={item.id} value={item.name} />)}</datalist>
              </Campo>
              <Campo id="profile-academic-role" label="Actividad académica" error={errorDe('academic_role')}>
                <select id="profile-academic-role" value={profile.academic_role || ''} onChange={(e) => setField('academic_role', e.target.value)} required style={estiloInput}>
                  <option value="">Selecciona</option>
                  <option value="docente">Docente</option>
                  <option value="investigador">Investigador/a</option>
                  <option value="ambos">Docente e investigador/a</option>
                </select>
              </Campo>
              <Campo id="profile-organization-area" label="Área o campo de investigación" error={errorDe('organization_area')}>
                <input id="profile-organization-area" value={profile.organization_area || ''} onChange={(e) => setField('organization_area', e.target.value)} maxLength={255} style={estiloInput} />
              </Campo>
              <Campo id="profile-organization-position" label="Cargo o función" error={errorDe('organization_position')}>
                <input id="profile-organization-position" value={profile.organization_position || ''} onChange={(e) => setField('organization_position', e.target.value)} maxLength={255} style={estiloInput} />
              </Campo>
            </>}

            {profile.account_type === 'empleado_organizacion' && <>
              <Campo id="profile-organization-name" label="Organización" error={errorDe('organization_name')}>
                <input id="profile-organization-name" list="profile-organization-list" value={profile.organization_name || ''} onChange={(e) => { const name = e.target.value; setProfile({ ...profile, organization_name: name, organization_id: catalog.find((item) => item.name === name)?.id ?? null }); }} required maxLength={255} style={estiloInput} />
                <datalist id="profile-organization-list">{catalog.map((item) => <option key={item.id} value={item.name} />)}</datalist>
                <p style={{ color: '#64748b', fontSize: '12px' }}>Selecciona una opción o escribe una organización que aún no esté en la lista.</p>
              </Campo>
              <Campo id="profile-organization-area" label="Área o departamento" error={errorDe('organization_area')}>
                <input id="profile-organization-area" value={profile.organization_area || ''} onChange={(e) => setField('organization_area', e.target.value)} required maxLength={255} style={estiloInput} />
              </Campo>
              <Campo id="profile-organization-position" label="Cargo o puesto" error={errorDe('organization_position')}>
                <input id="profile-organization-position" value={profile.organization_position || ''} onChange={(e) => setField('organization_position', e.target.value)} required maxLength={255} style={estiloInput} />
              </Campo>
            </>}

            {esResidente && <>
              <Campo id="profile-municipality" label="Municipio" error={errorDe('municipality')}>
                <select id="profile-municipality" value={profile.municipality || ''} onChange={(e) => setField('municipality', e.target.value)} required style={estiloInput}>
                  <option value="">Selecciona tu municipio</option>
                  {opcionesConActual(MUNICIPIOS_OAXACA, profile.municipality || '').map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Campo>
              <Campo id="profile-locality" label="Barrio, colonia o comunidad" error={errorDe('locality')}>
                <input id="profile-locality" value={profile.locality || ''} onChange={(e) => setField('locality', e.target.value)} required maxLength={255} style={estiloInput} />
              </Campo>
            </>}

            {profile.affiliation_status === 'pending' && (
              <p role="status" style={{ background: '#fff7ed', color: '#9a3412', padding: '0.875rem 1rem', borderRadius: '10px' }}>
                Tu cambio de institución, organización o tipo de cuenta está pendiente de revisión. Tu información anterior sigue activa.
              </p>
            )}

            {profile.affiliation_status === 'rejected' && (
              <p role="status" style={{ background: '#fef2f2', color: '#991b1b', padding: '0.875rem 1rem', borderRadius: '10px' }}>
                Solicitud rechazada: {profile.affiliation_rejection_reason || 'Consulta a ProyectaTec el motivo'}. Puedes corregir los datos y volver a solicitar revisión.
              </p>
            )}

            <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
              <legend style={{ fontWeight: 600, padding: '0 0.4rem' }}>Privacidad</legend>
              <p style={{ color: '#64748b', fontSize: '13px' }}>Elige qué datos quieres mostrar. La matrícula siempre es privada; el correo y el teléfono solo se publican si los marcas.</p>
              {[
                ['location', 'Ubicación'],
                ['email', 'Correo electrónico'],
                ['phone', 'Teléfono'],
                ['interest_areas', 'Áreas de interés'],
                ...(profile.account_type === 'estudiante' || profile.account_type === 'academico' ? [['institution', 'Institución']] : []),
                ...(profile.account_type === 'estudiante' ? [['field_of_study', 'Carrera o programa']] : []),
                ...(profile.account_type === 'empleado_organizacion' ? [['organization_name', 'Organización'], ['organization_area', 'Área'], ['organization_position', 'Cargo']] : []),
                ...(profile.account_type === 'academico' ? [['academic_role', 'Actividad académica']] : []),
              ].map(([field, label]) => (
                <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.65rem 0', color: '#334155', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={profile.public_fields?.includes(field) ?? false}
                    onChange={(event) => setProfile((current) => ({
                      ...current,
                      public_fields: event.target.checked
                        ? [...(current.public_fields ?? []), field]
                        : (current.public_fields ?? []).filter((item) => item !== field),
                    }))}
                  />
                  Mostrar {label.toLocaleLowerCase()} en mi perfil público
                </label>
              ))}
            </fieldset>

            {/* Correo de contacto */}
            <div>
              <label htmlFor="profile-email" style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Correo de contacto
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
                maxLength={255}
                aria-invalid={Boolean(validationErrors.email)}
                placeholder="contacto@ejemplo.com"
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {validationErrors.email && <span style={{ color: '#b91c1c', fontSize: '12px' }}>{validationErrors.email[0]}</span>}
            </div>

            <Campo id="profile-phone" label="Teléfono de contacto" error={errorDe('phone')}>
              <input
                id="profile-phone"
                type="tel"
                inputMode="numeric"
                placeholder="9511234567"
                value={profile.phone || ''}
                onChange={(e) => setField('phone', e.target.value)}
                maxLength={REGLAS_CAMPO.phone.maxLength}
                style={estiloInput}
              />
            </Campo>

            {/* Descripción breve */}
            <div>
              <label htmlFor="profile-description" style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Descripción breve
              </label>
              <textarea
                id="profile-description"
                rows={3}
                value={profile.description || ''}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Describe tu actividad e intereses"
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {!esResidente && (
              <SelectorUbicacion
                idPrefix="profile-location"
                value={profile.location || ''}
                onChange={(location) => setProfile((current) => ({ ...current, location }))}
              />
            )}
            <AreasInteresSelector
              value={profile.interest_areas || []}
              onChange={(interest_areas) => setProfile((current) => ({ ...current, interest_areas }))}
              error={validationErrors.interest_areas?.[0]}
            />

            {/* Botones */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: '999px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/mi-perfil?tipo=persona')}
                style={{
                  padding: '0.75rem 1.75rem',
                  borderRadius: '999px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>

          </form>
        </div>

        {/* Tarjeta Derecha: Vista pública */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
            Vista pública
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '1.75rem' }}>
            Esta información aparecerá en tu perfil público. La disposición es igual para todos los tipos de cuenta.
          </p>

          <button
            type="button"
            onClick={() => navigate('/perfil-publico')}
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              borderRadius: '999px',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Ver perfil público
          </button>
        </div>

      </div>
    </div>
  );
}