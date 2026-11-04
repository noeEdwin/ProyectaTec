import { useCallback, useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getMyProfile, updateMyProfile, type UserProfile } from '../api/profileService';
import { useAuth } from '../context/auth-context';
import { correoValido, traducirErrorCorreo } from '../utils/Correo';

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

// ---------- Límites ----------
const MAX_NOMBRE = 255;
const MAX_CORREO = 255;
const MAX_DESCRIPCION = 500;
const MAX_AREAS = 6;

// Ruta de la pantalla "Mi perfil" (cámbiala si tu ruta es otra)
const RUTA_MI_PERFIL = '/mi-perfil';

// ---------- Ubicación ----------
const PAIS_MEXICO = 'México';
const PAISES = [PAIS_MEXICO];

const ESTADOS_MEXICO = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
];

// ---------- Áreas de interés (sin comas en los nombres) ----------
const AREAS_INTERES = [
  'Tecnología e innovación',
  'Desarrollo de software',
  'Inteligencia artificial y datos',
  'Electrónica y robótica',
  'Telecomunicaciones',
  'Energías renovables',
  'Medio ambiente y sustentabilidad',
  'Agroindustria y alimentos',
  'Biotecnología',
  'Salud y bienestar',
  'Educación y formación',
  'Turismo y cultura',
  'Artesanías y diseño',
  'Manufactura e industria',
  'Construcción e infraestructura',
  'Logística y transporte',
  'Comercio y emprendimiento',
  'Finanzas y administración',
  'Desarrollo comunitario',
  'Ciencias sociales',
];

// ---------- Utilidades ----------
// La ubicación se guarda como texto: "Oaxaca, México" (o solo "México")
function parseUbicacion(location?: string | null) {
  if (!location) return { pais: '', estado: '' };
  const partes = location.split(',').map((p) => p.trim());
  const ultima = partes[partes.length - 1];
  if (!PAISES.includes(ultima)) return { pais: '', estado: '' };
  const estado =
    partes.length > 1 && ESTADOS_MEXICO.includes(partes[0]) ? partes[0] : '';
  return { pais: ultima, estado };
}

function armarUbicacion(pais: string, estado: string) {
  if (!pais) return '';
  return estado ? `${estado}, ${pais}` : pais;
}

// Las áreas se guardan en field_of_study separadas por coma: "Salud y bienestar, Biotecnología"
function parseAreas(valor?: string | null) {
  if (!valor) return [];
  return valor
    .split(',')
    .map((a) => a.trim())
    .filter((a) => AREAS_INTERES.includes(a));
}

const estiloInput = (conError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '10px',
  border: `1px solid ${conError ? '#ef4444' : '#cbd5e1'}`,
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
});

const estiloLabel: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: '14px',
  color: '#334155',
  marginBottom: '6px',
};

export default function Perfil() {
  const navigate = useNavigate();
  const [busqueda] = useSearchParams();
  const { user } = useAuth();

  // Al volver a Mi perfil se conserva el ?tipo= con el que se llegó a esta pantalla
  const tipoPerfil = busqueda.get('tipo');
  const rutaMiPerfil = tipoPerfil
    ? `${RUTA_MI_PERFIL}?tipo=${encodeURIComponent(tipoPerfil)}`
    : RUTA_MI_PERFIL;

  const [profile, setProfile] = useState<UserProfile>({
    display_name: '',
    description: '',
    phone: '',
    location: '',
    institution: '',
    field_of_study: '',
    account_type: '',
    email: '',
  });

  const [pais, setPais] = useState('');
  const [estado, setEstado] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [areasAbiertas, setAreasAbiertas] = useState(false);
  const areasRef = useRef<HTMLDivElement | null>(null);
  const redirectTimer = useRef<number | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

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
      case 422: {
        const errores = { ...(data?.errors || {}) };
        if (errores.email?.[0]) {
          errores.email = [traducirErrorCorreo(errores.email[0]) as string];
        }
        setValidationErrors(errores);
        setErrorMessage('Por favor corrige los campos indicados.');
        break;
      }
      default:
        setErrorMessage(data?.message || 'Ocurrió un error inesperado.');
    }
  }, [navigate]);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMyProfile();
      setProfile({
        display_name: data.display_name || user?.name || '',
        description: data.description || '',
        phone: data.phone || '',
        location: data.location || '',
        institution: data.institution || '',
        field_of_study: data.field_of_study || '',
        account_type: data.account_type || user?.account_type || '',
        email: data.email || user?.email || '',
      });
      const ubicacion = parseUbicacion(data.location);
      setPais(ubicacion.pais);
      setEstado(ubicacion.estado);
      setAreas(parseAreas(data.field_of_study));
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setProfile({
          display_name: user?.name || '',
          description: '',
          phone: '',
          location: '',
          institution: '',
          field_of_study: '',
          account_type: user?.account_type || '',
          email: user?.email || '',
        });
        setPais('');
        setEstado('');
        setAreas([]);
        setErrorMessage(null);
      } else {
        handleApiError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [handleApiError, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProfileData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchProfileData]);

  // Limpiar el temporizador de redirección si se sale de la pantalla antes
  useEffect(() => {
    return () => {
      if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
    };
  }, []);

  // Cerrar el desplegable de áreas al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!areasAbiertas) return;

    const onClickFuera = (e: MouseEvent) => {
      if (areasRef.current && !areasRef.current.contains(e.target as Node)) {
        setAreasAbiertas(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAreasAbiertas(false);
    };

    document.addEventListener('mousedown', onClickFuera);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickFuera);
      document.removeEventListener('keydown', onKey);
    };
  }, [areasAbiertas]);

  const toggleArea = (area: string) => {
    setAreas((actuales) => {
      if (actuales.includes(area)) return actuales.filter((a) => a !== area);
      if (actuales.length >= MAX_AREAS) return actuales;
      return [...actuales, area];
    });
  };

  const handlePaisChange = (nuevoPais: string) => {
    setPais(nuevoPais);
    setEstado('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationErrors({});

    // ---------- Validación en el cliente ----------
    const nombreLimpio = profile.display_name.trim();
    const correoLimpio = (profile.email || '').trim();
    const descripcionLimpia = (profile.description || '').trim();

    const errores: Record<string, string[]> = {};

    if (!nombreLimpio) {
      errores.display_name = ['El nombre no puede quedar vacío.'];
    } else if (nombreLimpio.length > MAX_NOMBRE) {
      errores.display_name = ['El nombre es demasiado largo.'];
    }

    if (!profile.account_type) {
      errores.account_type = ['Selecciona un tipo de cuenta.'];
    }

    if (!correoLimpio) {
      errores.email = ['Ingresa tu correo electrónico.'];
    } else if (correoLimpio.length > MAX_CORREO) {
      errores.email = ['El correo es demasiado largo.'];
    } else if (!correoValido(correoLimpio)) {
      errores.email = ['Ingresa un correo electrónico válido.'];
    }

    if (descripcionLimpia.length > MAX_DESCRIPCION) {
      errores.description = [`La descripción no puede superar los ${MAX_DESCRIPCION} caracteres.`];
    }

    if (areas.length > MAX_AREAS) {
      errores.field_of_study = [`Selecciona máximo ${MAX_AREAS} áreas de interés.`];
    }

    if (Object.keys(errores).length > 0) {
      setValidationErrors(errores);
      setErrorMessage('Por favor corrige los campos indicados.');
      return;
    }

    // ---------- Envío ----------
    setSaving(true);
    let guardado = false;

    try {
      const res = await updateMyProfile({
        display_name: nombreLimpio,
        description: descripcionLimpia,
        phone: profile.phone,
        location: armarUbicacion(pais, estado),
        institution: profile.institution,
        field_of_study: areas.join(', '),
        account_type: profile.account_type,
        email: correoLimpio,
      });
      if (res) {
        setProfile((p) => ({
          ...p,
          display_name: nombreLimpio,
          email: correoLimpio,
          description: descripcionLimpia,
        }));
        guardado = true;
        setSuccessMessage('¡Perfil guardado! Redirigiendo a tu perfil...');
        redirectTimer.current = window.setTimeout(() => navigate(rutaMiPerfil), 800);
      }
    } catch (error: unknown) {
      handleApiError(error);
    } finally {
      // Si se guardó, el botón queda bloqueado hasta salir de la pantalla
      if (!guardado) setSaving(false);
    }
  };

  const mensajeError = (campo: string) =>
    validationErrors[campo]?.[0] ? (
      <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
        {validationErrors[campo][0]}
      </span>
    ) : null;

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
        Cargando datos del perfil...
      </div>
    );
  }

  const descripcionLongitud = (profile.description || '').length;

  return (
    <div style={{ maxWidth: '1140px', margin: '2.5rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif' }}>

      {/* Encabezado con el tono naranja institucional exacto */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-block',
          borderBottom: '3px solid #d97706',
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
        <div role="alert" style={{
          background: '#fee2e2', color: '#b91c1c', padding: '0.875rem 1.25rem',
          borderRadius: '10px', marginBottom: '1.5rem', fontSize: '14px', fontWeight: 500
        }}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div role="status" style={{
          background: '#dcfce7', color: '#15803d', padding: '0.875rem 1.25rem',
          borderRadius: '10px', marginBottom: '1.5rem', fontSize: '14px', fontWeight: 500
        }}>
          {successMessage}
        </div>
      )}

      {/* Grid de 2 Columnas */}
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

          <form
            onSubmit={handleSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >

            {/* Nombre o razón social */}
            <div>
              <label htmlFor="perfil-nombre" style={estiloLabel}>
                Nombre o razón social
              </label>
              <input
                id="perfil-nombre"
                type="text"
                value={profile.display_name}
                maxLength={MAX_NOMBRE}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Ingresa tu nombre o razón social"
                aria-invalid={Boolean(validationErrors.display_name)}
                style={estiloInput(Boolean(validationErrors.display_name))}
              />
              {mensajeError('display_name')}
            </div>

            {/* Tipo de cuenta */}
            <div>
              <label htmlFor="perfil-tipo" style={estiloLabel}>
                Tipo de cuenta
              </label>
              <select
                id="perfil-tipo"
                value={profile.account_type || ''}
                onChange={(e) => setProfile({ ...profile, account_type: e.target.value })}
                aria-invalid={Boolean(validationErrors.account_type)}
                style={{ ...estiloInput(Boolean(validationErrors.account_type)), cursor: 'pointer' }}
              >
                <option value="" disabled>Selecciona un tipo de cuenta</option>
                <option value="docente">Docente / asesor</option>
                <option value="estudiante">Estudiante</option>
                <option value="institucion_educativa">Institución educativa</option>
                <option value="empresa">Empresa / MIPYME</option>
                <option value="sector_social">Comunidad / sector social</option>
              </select>
              {mensajeError('account_type')}
            </div>

            {/* Correo de contacto */}
            <div>
              <label htmlFor="perfil-correo" style={estiloLabel}>
                Correo de contacto
              </label>
              <input
                id="perfil-correo"
                type="email"
                value={profile.email || ''}
                maxLength={MAX_CORREO}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="contacto@ejemplo.com"
                aria-invalid={Boolean(validationErrors.email)}
                style={estiloInput(Boolean(validationErrors.email))}
              />
              {mensajeError('email')}
            </div>

            {/* Descripción breve */}
            <div>
              <label htmlFor="perfil-descripcion" style={estiloLabel}>
                Descripción breve
              </label>
              <textarea
                id="perfil-descripcion"
                rows={4}
                value={profile.description || ''}
                maxLength={MAX_DESCRIPCION}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Describe tu actividad e intereses"
                aria-invalid={Boolean(validationErrors.description)}
                style={{ ...estiloInput(Boolean(validationErrors.description)), resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div>{mensajeError('description')}</div>
                <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {descripcionLongitud}/{MAX_DESCRIPCION}
                </span>
              </div>
            </div>

            {/* País y estado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="perfil-pais" style={estiloLabel}>
                  País
                </label>
                <select
                  id="perfil-pais"
                  value={pais}
                  onChange={(e) => handlePaisChange(e.target.value)}
                  style={{ ...estiloInput(false), cursor: 'pointer' }}
                >
                  <option value="">Selecciona un país</option>
                  {PAISES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="perfil-estado" style={estiloLabel}>
                  Estado
                </label>
                <select
                  id="perfil-estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  disabled={!pais}
                  style={{
                    ...estiloInput(false),
                    cursor: pais ? 'pointer' : 'not-allowed',
                    opacity: pais ? 1 : 0.6,
                  }}
                >
                  <option value="">
                    {pais ? 'Selecciona un estado' : 'Primero elige un país'}
                  </option>
                  {pais === PAIS_MEXICO &&
                    ESTADOS_MEXICO.map((est) => (
                      <option key={est} value={est}>{est}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Áreas de interés (selección múltiple) */}
            <div ref={areasRef} style={{ position: 'relative' }}>
              <label id="perfil-areas-label" style={estiloLabel}>
                Áreas de interés
              </label>

              <button
                type="button"
                onClick={() => setAreasAbiertas((v) => !v)}
                aria-expanded={areasAbiertas}
                aria-labelledby="perfil-areas-label"
                style={{
                  ...estiloInput(Boolean(validationErrors.field_of_study)),
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: areas.length ? '#0f172a' : '#94a3b8',
                }}
              >
                <span>
                  {areas.length
                    ? `${areas.length} ${areas.length === 1 ? 'área seleccionada' : 'áreas seleccionadas'}`
                    : 'Selecciona tus áreas de interés'}
                </span>
                <span aria-hidden="true">{areasAbiertas ? '▴' : '▾'}</span>
              </button>

              {areasAbiertas && (
                <div style={{
                  position: 'absolute',
                  zIndex: 10,
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  maxHeight: '260px',
                  overflowY: 'auto',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                  padding: '0.5rem',
                }}>
                  {AREAS_INTERES.map((area) => {
                    const marcada = areas.includes(area);
                    const bloqueada = !marcada && areas.length >= MAX_AREAS;
                    return (
                      <label
                        key={area}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.5rem 0.6rem',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: bloqueada ? '#94a3b8' : '#334155',
                          cursor: bloqueada ? 'not-allowed' : 'pointer',
                          background: marcada ? '#EDF5F6' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={marcada}
                          disabled={bloqueada}
                          onChange={() => toggleArea(area)}
                        />
                        {area}
                      </label>
                    );
                  })}
                </div>
              )}

              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                Puedes elegir hasta {MAX_AREAS} áreas ({areas.length}/{MAX_AREAS}).
              </span>
              {mensajeError('field_of_study')}

              {areas.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.6rem' }}>
                  {areas.map((area) => (
                    <span
                      key={area}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#EDF5F6',
                        color: '#0f172a',
                        border: '1px solid #cfe3e6',
                        borderRadius: '999px',
                        padding: '0.25rem 0.7rem',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => toggleArea(area)}
                        aria-label={`Quitar ${area}`}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#0f172a',
                          cursor: 'pointer',
                          fontSize: '14px',
                          lineHeight: 1,
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Botones de acción */}
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
                onClick={() => navigate(rutaMiPerfil)}
                style={{
                  padding: '0.75rem 1.75rem',
                  borderRadius: '999px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: '600',
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

        {/* Tarjeta Derecha: Vista pública corregida a /perfil-publico */}
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