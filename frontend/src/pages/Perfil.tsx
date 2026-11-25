import { useCallback, useState, useEffect } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  changeMyPassword,
  getMyOrganizationRoleRequests,
  getMyOrganizations,
  getMyProfile,
  getOrganizationCatalog,
  requestOrganizationRole,
  updateMyProfile,
  uploadMyProfileAvatar,
  type OrganizationAccess,
  type OrganizationCatalogItem,
  type OrganizationRoleRequest,
  type UserProfile,
} from '../api/profileService';
import { useAuth } from '../context/auth-context';
import { correoValido, traducirErrorCorreo } from '../utils/Correo';
import { validarContrasenaSegura } from '../utils/passwordValidation';
import PasswordChecklist from '../components/PasswordChecklist';
import AreasInteresSelector from '../components/perfiles/AreasInteresSelector';
import SelectorUbicacion from '../components/perfiles/SelectorUbicacion';
import SelectorEgreso from '../components/perfiles/SelectorEgreso';
import { validarFechaEgreso } from '../utils/fechaEgreso';
import { MUNICIPIOS_OAXACA } from '../data/municipiosOaxaca';
import '../styles/perfil.css';
import {
  REGLAS_CAMPO, SEMESTRES, filtrarCampo, filtrarNombrePersona, opcionesConActual, validarCampo, validarNombrePersona, ubicacionOaxaca, separarUbicacionOaxaca,
} from '../utils/camposPerfil';

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

const accountTypeOptions = [
  { value: 'estudiante', label: 'Estudiante', group: 'academico', approvalHint: 'Cambio de institución o paso a docente requiere aprobación del titular de la institución o administración.' },
  { value: 'academico', label: 'Personal académico (docente o investigador)', group: 'academico', approvalHint: 'Requiere aprobación del titular de tu institución (si tiene representante) o de ProyectaTec.' },
  { value: 'empleado_organizacion', label: 'Empleado de una organización', group: 'organizacion', approvalHint: 'La vinculación y el ascenso a administrador requieren aprobación del dueño de la organización.' },
  { value: 'residente_oaxaca', label: 'Persona de Oaxaca', group: 'comunidad', approvalHint: 'Perfil ciudadano directo.' },
];

type AccountTypeFilter = 'all' | 'academico' | 'organizacion' | 'comunidad';

const estiloLabel: CSSProperties = { display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' };
const estiloInput: CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

// Campos que se validan según el tipo de cuenta (además del teléfono).
const CAMPOS_A_VALIDAR: Record<string, string[]> = {
  estudiante: ['field_of_study', 'student_number'],
  academico: ['organization_area', 'organization_position'],
  empleado_organizacion: ['organization_area', 'organization_position'],
  residente_oaxaca: ['locality'],
};

function Campo({
  id,
  label,
  error,
  required = false,
  optional = false,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} style={estiloLabel}>
        {label}
        {required && <span className="campo-obligatorio" aria-hidden="true">*</span>}
        {optional && <span className="campo-opcional">(opcional)</span>}
      </label>
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
  const { user, refreshUser } = useAuth();

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
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [catalog, setCatalog] = useState<OrganizationCatalogItem[]>([]);
  const [initialAccountType, setInitialAccountType] = useState<string>('estudiante');
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountTypeFilter>('all');
  const [affiliationReason, setAffiliationReason] = useState<string>('');
  const [institutionManual, setInstitutionManual] = useState<boolean>(false);
  const [institutionLocation, setInstitutionLocation] = useState<string>('');
  const [institutionWebsite, setInstitutionWebsite] = useState<string>('');
  const [myOrganizations, setMyOrganizations] = useState<OrganizationAccess[]>([]);
  const [roleRequests, setRoleRequests] = useState<OrganizationRoleRequest[]>([]);
  const [roleNote, setRoleNote] = useState<string>('');
  const [roleRequestBusy, setRoleRequestBusy] = useState<boolean>(false);
  const [roleRequestFeedback, setRoleRequestFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPwd, setShowCurrentPwd] = useState<boolean>(false);
  const [showNewPwd, setShowNewPwd] = useState<boolean>(false);
  const [passwordBusy, setPasswordBusy] = useState<boolean>(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

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
      const normalizedType = normalizeAccountType(data.account_type || user?.account_type);
      setInitialAccountType(normalizedType);
      setProfile({
        display_name: data.display_name || user?.name || '',
        image_url: data.image_url ?? null,
        description: data.description || '',
        phone: data.phone || '',
        location: data.location || '',
        institution: data.institution || '',
        field_of_study: data.field_of_study || '',
        interest_areas: data.interest_areas || [],
        account_type: normalizedType,
        email: data.email || user?.email || '',
        campus: data.campus || '',
        semester: data.semester || '',
        student_number: data.student_number || '',
        expected_graduation: data.expected_graduation
          ? (/^\d{4}$/.test(data.expected_graduation.trim())
            ? `${data.expected_graduation.trim()}-06`
            : (/^\d{4}-\d{2}$/.test(data.expected_graduation.trim()) ? data.expected_graduation.trim() : ''))
          : '',
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
        has_pending_institution_approval: data.has_pending_institution_approval || false,
      });
      void Promise.all([
        getMyOrganizations().then(setMyOrganizations).catch(() => setMyOrganizations([])),
        getMyOrganizationRoleRequests().then(setRoleRequests).catch(() => setRoleRequests([])),
      ]);
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
    const errNombre = validarNombrePersona(profile.display_name, 'El nombre');
    if (errNombre) {
      erroresLocales.display_name = [errNombre];
    }
    const correoLimpio = (profile.email ?? '').trim();
    if (!correoLimpio || !correoValido(correoLimpio)) {
      erroresLocales.email = ['Ingresa un correo electrónico válido (ej. nombre@dominio.com).'];
    }
    for (const clave of ['phone', ...(CAMPOS_A_VALIDAR[profile.account_type ?? ''] ?? [])]) {
      const mensaje = validarCampo(clave, String(profile[clave as keyof UserProfile] ?? ''));
      if (mensaje) erroresLocales[clave] = [mensaje];
    }
    if (profile.account_type === 'estudiante') {
      const errEgreso = validarFechaEgreso(profile.expected_graduation ?? '');
      if (errEgreso) erroresLocales.expected_graduation = [errEgreso];
    }
    const accountTypeChanged = (profile.account_type ?? '') !== initialAccountType;
    if (accountTypeChanged && profile.account_type === 'academico' && !affiliationReason.trim()) {
      erroresLocales.affiliation_reason = ['Explica brevemente el motivo o cargo para solicitar el cambio a Personal académico.'];
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
        request_new_institution: institutionManual ? true : undefined,
        institution_location: institutionManual && institutionLocation.trim() ? institutionLocation.trim() : undefined,
        institution_website: institutionManual && institutionWebsite.trim() ? institutionWebsite.trim() : undefined,
        affiliation_reason: affiliationReason.trim() || undefined,
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
        if (res.account_type) {
          setInitialAccountType(normalizeAccountType(res.account_type));
        }
        setAffiliationReason('');
        if (res.affiliation_status === 'pending') {
          setInstitutionManual(false);
          setInstitutionLocation('');
          setInstitutionWebsite('');
        }
        setSuccessMessage(res.affiliation_status === 'pending'
          ? 'La solicitud de cambio de institución, rol u organización quedó pendiente de revisión. Los datos actuales siguen activos.'
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

  const institucionesVerificadas = catalog.filter((item) => item.organization_type === 'institucion_educativa');
  const filteredAccountTypeOptions = accountTypeOptions.filter(
    (option) => accountTypeFilter === 'all' || option.group === accountTypeFilter || option.value === profile.account_type,
  );
  const activeAccountMeta = accountTypeOptions.find((option) => option.value === profile.account_type);
  const accountTypeChanged = (profile.account_type ?? '') !== initialAccountType;
  const matchedOrgId = profile.organization_id
    ?? catalog.find((item) => item.name === profile.organization_name)?.id
    ?? null;
  const currentOrgMembership = matchedOrgId
    ? myOrganizations.find((org) => org.id === matchedOrgId) ?? null
    : myOrganizations[0] ?? null;
  const currentRoleRequest = roleRequests.find((req) => (matchedOrgId ? req.organization_id === matchedOrgId : true)) ?? null;

  async function handleRequestAdminRole(targetOrgId: number) {
    const trimmedNote = roleNote.trim();
    if (!trimmedNote) {
      setRoleRequestFeedback({ type: 'error', text: 'Explica tu cargo o motivo para solicitar el rol de administrador.' });
      return;
    }
    setRoleRequestBusy(true);
    setRoleRequestFeedback(null);
    try {
      await requestOrganizationRole(targetOrgId, { role: 'admin', note: trimmedNote });
      setRoleNote('');
      setRoleRequests(await getMyOrganizationRoleRequests());
      setRoleRequestFeedback({ type: 'ok', text: 'Solicitud de ascenso enviada al responsable de la organización.' });
    } catch (err: unknown) {
      const apiMsg = axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
      setRoleRequestFeedback({ type: 'error', text: apiMsg || 'No se pudo enviar la solicitud de rango.' });
    } finally {
      setRoleRequestBusy(false);
    }
  }

  function renderInstitutionSelect(label: string) {
    const opciones = opcionesConActual(institucionesVerificadas.map((item) => item.name), profile.institution || '');
    return (
      <Campo id="profile-institution" label={label} error={errorDe('institution')}>
        {!institutionManual ? (
          <>
            <select
              id="profile-institution"
              value={profile.institution || ''}
              onChange={(event) => {
                if (event.target.value === '__other__') {
                  setInstitutionManual(true);
                  setField('institution', '');
                } else {
                  setField('institution', event.target.value);
                }
              }}
              required
              style={estiloInput}
            >
              <option value="">Selecciona una institución verificada</option>
              {opciones.map((nombreInst) => <option key={nombreInst} value={nombreInst}>{nombreInst}</option>)}
              <option value="__other__">No aparece en la lista (solicitar alta al administrador)</option>
            </select>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              id="profile-institution"
              value={profile.institution || ''}
              onChange={(e) => setField('institution', e.target.value)}
              placeholder="Nombre oficial de la institución"
              required
              maxLength={255}
              style={estiloInput}
            />
            <input
              type="text"
              value={institutionLocation}
              onChange={(e) => setInstitutionLocation(e.target.value)}
              placeholder="Ubicación o municipio (opcional)"
              maxLength={255}
              style={estiloInput}
            />
            <input
              type="url"
              value={institutionWebsite}
              onChange={(e) => setInstitutionWebsite(e.target.value)}
              placeholder="Sitio web oficial (opcional, https://...)"
              maxLength={255}
              style={estiloInput}
            />
            <p style={{ margin: 0, fontSize: '12px', color: '#9a3412' }}>
              Esta solicitud llegará al administrador. No podrás publicar iniciativas ni administrar esa institución hasta que sea aprobada.
            </p>
            <button
              type="button"
              onClick={() => { setInstitutionManual(false); setInstitutionLocation(''); setInstitutionWebsite(''); }}
              style={{
                alignSelf: 'flex-start',
                marginTop: '4px',
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f4c5c',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              ← Elegir de las instituciones verificadas
            </button>
          </div>
        )}
      </Campo>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
        Cargando datos del perfil...
      </div>
    );
  }

  return (
    <div className="perfil-editor-page">

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
      <div className="perfil-editor-grid">

        {/* Tarjeta Izquierda: Formulario */}
        <div className="perfil-editor-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem' }}>
            Datos de tu perfil
          </h2>

          {/* Foto de perfil */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
            padding: '1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', flex: 'none',
              background: '#e0f2fe', color: '#0f4c5c', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700, border: '1px solid #cbd5e1',
            }}>
              {profile.image_url ? (
                <img src={profile.image_url} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (profile.display_name || user?.name || 'PT').slice(0, 2).toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Foto de perfil</p>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b' }}>
                Formatos JPG, PNG o WebP (máximo 2 MB).
              </p>
              <label
                htmlFor="profile-avatar-input"
                style={{
                  display: 'inline-block', padding: '7px 14px', borderRadius: '999px',
                  background: uploadingAvatar ? '#cbd5e1' : '#0f4c5c', color: '#fff',
                  fontSize: '12px', fontWeight: 600, cursor: uploadingAvatar ? 'wait' : 'pointer',
                }}
              >
                {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto de perfil'}
              </label>
              <input
                id="profile-avatar-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingAvatar}
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setAvatarError('');
                  setSuccessMessage(null);
                  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                    setAvatarError('Selecciona una imagen JPG, PNG o WebP.');
                    return;
                  }
                  if (file.size > 2 * 1024 * 1024) {
                    setAvatarError('La imagen supera el límite de 2 MB.');
                    return;
                  }
                  try {
                    setUploadingAvatar(true);
                    const result = await uploadMyProfileAvatar(file);
                    setProfile((prev) => ({ ...prev, image_url: result.image_url ?? prev.image_url }));
                    await refreshUser();
                    setSuccessMessage('Foto de perfil actualizada correctamente.');
                  } catch (err: unknown) {
                    if (axios.isAxiosError(err) && err.response?.data?.message) {
                      setAvatarError(err.response.data.message);
                    } else {
                      setAvatarError('No se pudo subir la foto de perfil.');
                    }
                  } finally {
                    setUploadingAvatar(false);
                  }
                }}
              />
              {avatarError && (
                <span role="alert" style={{ color: '#b91c1c', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                  {avatarError}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p className="form-leyenda-obligatorios" style={{ marginBottom: 0 }}>
              Los campos marcados con <span className="campo-obligatorio">*</span> son obligatorios.
            </p>

            {/* Nombre o razón social */}
            <div>
              <label htmlFor="profile-display-name" style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Nombre o razón social<span className="campo-obligatorio" aria-hidden="true">*</span>
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: filtrarNombrePersona(e.target.value) })}
                placeholder="Edwin Noé Sánchez"
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

            {/* Filtro y Tipo de cuenta */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label htmlFor="profile-account-filter" style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                  Filtrar cambios de tipo de cuenta
                </label>
                <select
                  id="profile-account-filter"
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value as AccountTypeFilter)}
                  style={estiloInput}
                >
                  <option value="all">Todos los tipos de perfil</option>
                  <option value="academico">Académico / Institucional (requiere aprobación de administración)</option>
                  <option value="organizacion">Organización / Rango (requiere aprobación de organización)</option>
                  <option value="comunidad">Comunidad (Persona de Oaxaca)</option>
                </select>
              </div>

              <div>
                <label htmlFor="profile-account-type" style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                  Tipo de cuenta
                </label>
                <select
                  id="profile-account-type"
                  value={profile.account_type || ''}
                  onChange={(e) => setProfile({ ...profile, account_type: e.target.value })}
                  style={estiloInput}
                >
                  {filteredAccountTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {activeAccountMeta && (
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#475569' }}>
                    {activeAccountMeta.approvalHint}
                  </p>
                )}
              </div>

              {accountTypeChanged && (
                <Campo id="profile-affiliation-reason" label="Motivo o cargo que respalda el cambio de cuenta" error={errorDe('affiliation_reason')}>
                  <textarea
                    id="profile-affiliation-reason"
                    rows={2}
                    maxLength={500}
                    value={affiliationReason}
                    onChange={(e) => setAffiliationReason(e.target.value)}
                    placeholder="Ej. Egresado incorporado como docente, cambio de puesto en organización, etc."
                    style={{ ...estiloInput, resize: 'vertical' }}
                  />
                </Campo>
              )}
            </div>

            {profile.account_type === 'estudiante' && <>
              {renderInstitutionSelect('Institución educativa')}
              <Campo id="profile-field-of-study" label="Carrera o programa" required error={errorDe('field_of_study')}>
                <input id="profile-field-of-study" value={profile.field_of_study || ''} onChange={(e) => setField('field_of_study', e.target.value)} required maxLength={255} style={estiloInput} />
              </Campo>
              <Campo id="profile-semester" label="Semestre o periodo" required error={errorDe('semester')}>
                <select id="profile-semester" value={profile.semester || ''} onChange={(e) => setField('semester', e.target.value)} required style={estiloInput}>
                  <option value="">Selecciona tu semestre</option>
                  {SEMESTRES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  {profile.semester && !SEMESTRES.some((item) => item.value === profile.semester) && <option value={profile.semester}>{profile.semester}</option>}
                </select>
              </Campo>
              <Campo id="profile-student-number" label="Matrícula" required error={errorDe('student_number')}>
                <input id="profile-student-number" inputMode="numeric" value={profile.student_number || ''} onChange={(e) => setField('student_number', e.target.value)} required maxLength={REGLAS_CAMPO.student_number.maxLength} style={estiloInput} />
              </Campo>
              <Campo id="profile-expected-graduation" label="Fecha estimada de egreso" required error={errorDe('expected_graduation')}>
                <SelectorEgreso
                  idPrefix="profile-expected-graduation"
                  value={profile.expected_graduation || ''}
                  onChange={(val) => setField('expected_graduation', val)}
                  invalid={Boolean(errorDe('expected_graduation'))}
                />
              </Campo>
            </>}

            {profile.account_type === 'academico' && <>
              {renderInstitutionSelect('Institución')}
              <Campo id="profile-academic-role" label="Actividad académica" required error={errorDe('academic_role')}>
                <select id="profile-academic-role" value={profile.academic_role || ''} onChange={(e) => setField('academic_role', e.target.value)} required style={estiloInput}>
                  <option value="">Selecciona</option>
                  <option value="docente">Docente</option>
                  <option value="investigador">Investigador/a</option>
                  <option value="ambos">Docente e investigador/a</option>
                </select>
              </Campo>
              <Campo id="profile-organization-area" label="Área o campo de investigación" optional error={errorDe('organization_area')}>
                <input id="profile-organization-area" value={profile.organization_area || ''} onChange={(e) => setField('organization_area', e.target.value)} maxLength={255} style={estiloInput} />
              </Campo>
              <Campo id="profile-organization-position" label="Cargo o función" optional error={errorDe('organization_position')}>
                <input id="profile-organization-position" value={profile.organization_position || ''} onChange={(e) => setField('organization_position', e.target.value)} maxLength={255} style={estiloInput} />
              </Campo>
            </>}

            {profile.account_type === 'empleado_organizacion' && <>
              <Campo id="profile-organization-name" label="Organización" required error={errorDe('organization_name')}>
                <input id="profile-organization-name" list="profile-organization-list" value={profile.organization_name || ''} onChange={(e) => { const name = e.target.value; setProfile({ ...profile, organization_name: name, organization_id: catalog.find((item) => item.name === name)?.id ?? null }); }} required maxLength={255} style={estiloInput} />
                <datalist id="profile-organization-list">{catalog.map((item) => <option key={item.id} value={item.name} />)}</datalist>
                <p style={{ color: '#64748b', fontSize: '12px' }}>Selecciona una opción o escribe una organización que aún no esté en la lista.</p>
              </Campo>
              <Campo id="profile-organization-area" label="Área o departamento" required error={errorDe('organization_area')}>
                <input id="profile-organization-area" value={profile.organization_area || ''} onChange={(e) => setField('organization_area', e.target.value)} required maxLength={255} style={estiloInput} />
              </Campo>
              <Campo id="profile-organization-position" label="Cargo o puesto" required error={errorDe('organization_position')}>
                <input id="profile-organization-position" value={profile.organization_position || ''} onChange={(e) => setField('organization_position', e.target.value)} required maxLength={255} style={estiloInput} />
              </Campo>

              {matchedOrgId && (
                <div style={{ padding: '1rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                    Rango dentro de la organización
                  </strong>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#475569' }}>
                    Rol actual: <strong>{currentOrgMembership?.role === 'admin' ? 'Administrador de la organización' : currentOrgMembership ? 'Colaborador' : 'Sin membresía activa aún'}</strong>
                  </p>
                  {currentRoleRequest && (
                    <p role="status" style={{ margin: '0 0 8px', fontSize: '12px', color: currentRoleRequest.status === 'rejected' ? '#991b1b' : '#9a3412' }}>
                      {currentRoleRequest.status === 'rejected'
                        ? `Última solicitud rechazada (${currentRoleRequest.organization_name}): ${currentRoleRequest.rejection_reason || 'Sin motivo especificado'}.`
                        : `Solicitud en revisión para ${currentRoleRequest.organization_name}: ${currentRoleRequest.requested_role === 'admin' ? 'Administrador' : 'Colaborador'}.`}
                    </p>
                  )}
                  {roleRequestFeedback && (
                    <p role="status" style={{ margin: '0 0 8px', fontSize: '12px', color: roleRequestFeedback.type === 'ok' ? '#15803d' : '#b91c1c' }}>
                      {roleRequestFeedback.text}
                    </p>
                  )}
                  {currentOrgMembership?.role !== 'admin' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        value={roleNote}
                        onChange={(e) => setRoleNote(e.target.value)}
                        placeholder="Indica tu cargo o motivo para solicitar ser administrador"
                        maxLength={500}
                        style={estiloInput}
                      />
                      <button
                        type="button"
                        disabled={roleRequestBusy}
                        onClick={() => void handleRequestAdminRole(matchedOrgId)}
                        style={{
                          alignSelf: 'flex-start', padding: '0.5rem 1rem', borderRadius: '999px',
                          background: '#0f766e', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600,
                          cursor: roleRequestBusy ? 'wait' : 'pointer',
                        }}
                      >
                        {roleRequestBusy ? 'Enviando...' : 'Solicitar ascenso a Administrador'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>}

            {esResidente && <>
              <Campo id="profile-municipality" label="Municipio" required error={errorDe('municipality')}>
                <select id="profile-municipality" value={profile.municipality || ''} onChange={(e) => setField('municipality', e.target.value)} required style={estiloInput}>
                  <option value="">Selecciona tu municipio</option>
                  {opcionesConActual(MUNICIPIOS_OAXACA, profile.municipality || '').map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Campo>
              <Campo id="profile-locality" label="Barrio, colonia o comunidad" required error={errorDe('locality')}>
                <input id="profile-locality" value={profile.locality || ''} onChange={(e) => setField('locality', e.target.value)} required maxLength={255} style={estiloInput} />
              </Campo>
            </>}

            {profile.has_pending_institution_approval && (
              <p role="status" style={{ background: '#fff7ed', color: '#9a3412', padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                Solicitaste dar de alta una nueva institución. Hasta que administración la apruebe, no podrás publicar iniciativas ni administrar esa institución.
              </p>
            )}

            {profile.affiliation_status === 'pending' && !profile.has_pending_institution_approval && (
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
                Correo de contacto<span className="campo-obligatorio" aria-hidden="true">*</span>
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

            <Campo id="profile-phone" label="Teléfono de contacto" optional error={errorDe('phone')}>
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
              {(() => {
                const raw = (profile.phone || '').trim();
                const digitos = raw.replace(/\D/g, '');
                if (raw.length > 0 && (digitos.length !== 10 || /[^\d]/.test(raw))) {
                  return <p className="formato-ayuda invalido">Formato: 10 dígitos numéricos sin espacios (actual: {digitos.length}/10).</p>;
                }
                return <p className="formato-ayuda">Formato: 10 dígitos numéricos (ej. 9511234567).</p>;
              })()}
            </Campo>

            {/* Descripción breve */}
            <div>
              <label htmlFor="profile-description" style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Descripción breve<span className="campo-opcional">(opcional)</span>
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

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.75rem 0' }} />

          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Cambiar contraseña
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
            Actualiza tu contraseña de acceso sin salir de tu perfil.
          </p>

          {passwordFeedback && (
            <div
              role={passwordFeedback.type === 'error' ? 'alert' : 'status'}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                marginBottom: '1rem',
                fontSize: '13px',
                fontWeight: 600,
                background: passwordFeedback.type === 'ok' ? '#dcfce7' : '#fee2e2',
                color: passwordFeedback.type === 'ok' ? '#166534' : '#b91c1c',
                border: `1px solid ${passwordFeedback.type === 'ok' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {passwordFeedback.text}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPasswordFeedback(null);
              if (!currentPassword) {
                setPasswordFeedback({ type: 'error', text: 'Ingresa tu contraseña actual.' });
                return;
              }
              const errPwd = validarContrasenaSegura(newPassword);
              if (errPwd) {
                setPasswordFeedback({ type: 'error', text: errPwd });
                return;
              }
              if (newPassword !== confirmPassword) {
                setPasswordFeedback({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
                return;
              }
              setPasswordBusy(true);
              try {
                const msg = await changeMyPassword({
                  current_password: currentPassword,
                  password: newPassword,
                  password_confirmation: confirmPassword,
                });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordFeedback({ type: 'ok', text: msg });
              } catch (err: unknown) {
                const apiErr = axios.isAxiosError<ApiErrorResponse>(err) ? err.response?.data : undefined;
                const firstErr = apiErr?.errors ? Object.values(apiErr.errors).flat()[0] : undefined;
                setPasswordFeedback({
                  type: 'error',
                  text: firstErr || apiErr?.message || 'No se pudo actualizar la contraseña.',
                });
              } finally {
                setPasswordBusy(false);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
          >
            <div>
              <label htmlFor="profile-current-password" style={estiloLabel}>
                Contraseña actual<span className="campo-obligatorio" aria-hidden="true">*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="profile-current-password"
                  type={showCurrentPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={estiloInput}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd((v) => !v)}
                  style={{ padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                >
                  {showCurrentPwd ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="profile-new-password" style={estiloLabel}>
                Nueva contraseña<span className="campo-obligatorio" aria-hidden="true">*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="profile-new-password"
                  type={showNewPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={estiloInput}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd((v) => !v)}
                  style={{ padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                >
                  {showNewPwd ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <PasswordChecklist password={newPassword} />
            </div>

            <div>
              <label htmlFor="profile-confirm-password" style={estiloLabel}>
                Confirmar nueva contraseña<span className="campo-obligatorio" aria-hidden="true">*</span>
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={estiloInput}
              />
            </div>

            <button
              type="submit"
              disabled={passwordBusy}
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                borderRadius: '999px',
                background: '#0f4c5c',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: passwordBusy ? 'not-allowed' : 'pointer',
                opacity: passwordBusy ? 0.7 : 1,
              }}
            >
              {passwordBusy ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}