import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { getOrganizationCatalog, type OrganizationCatalogItem } from '../api/profileService';
import { traducirErrorCorreo } from '../utils/Correo';
import '../styles/registro.css';

export type RegistroPayload = {
  name: string;
  account_type: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  institution?: string;
  campus?: string;
  field_of_study?: string;
  semester?: string;
  student_number?: string;
  expected_graduation?: string;
  academic_role?: string;
  organization_name?: string;
  organization_id?: number;
  organization_area?: string;
  organization_position?: string;
  organization_type?: string;
  legal_name?: string;
  website?: string;
  organization_sector?: string;
  organization_email?: string;
  organization_phone?: string;
  municipality?: string;
  locality?: string;
  public_fields?: string[];
  organization_public_fields?: string[];
};

type RegistroProps = {
  onRegister?: (datos: RegistroPayload) => Promise<void>;
};

type RegistroErrors = Partial<
  Record<keyof RegistroPayload | 'general', string>
>;

const tiposCuenta = [
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'academico', label: 'Personal académico (docente o investigador)' },
  { value: 'empleado_organizacion', label: 'Empleado de una organización' },
  { value: 'residente_oaxaca', label: 'Persona de Oaxaca (barrio, colonia o comunidad)' },
  { value: 'organizacion', label: 'Organización' },
];

const perfilVacio: Record<string, string> = {};

export default function Registro({ onRegister }: RegistroProps) {
  const [nombre, setNombre] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [perfil, setPerfil] = useState<Record<string, string>>(perfilVacio);
  const [publicFields, setPublicFields] = useState<string[]>([]);
  const [organizationPublicFields, setOrganizationPublicFields] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<OrganizationCatalogItem[]>([]);
  const [institutionManual, setInstitutionManual] = useState(false);
  const [organizationManual, setOrganizationManual] = useState(false);

  const [errores, setErrores] = useState<RegistroErrors>({});
  const [mensaje, setMensaje] = useState('');
  const [procesando, setProcesando] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    void getOrganizationCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  function setProfileField(key: string, value: string) {
    setPerfil((current) => ({ ...current, [key]: value }));
  }

  function validateProfileFields(errors: RegistroErrors) {
    const required: Record<string, string[]> = {
      estudiante: ['institution', 'campus', 'field_of_study', 'semester', 'student_number', 'expected_graduation'],
      academico: ['institution', 'academic_role'],
      empleado_organizacion: ['organization_name', 'organization_area', 'organization_position'],
      residente_oaxaca: ['municipality', 'locality'],
      organizacion: ['organization_name', 'legal_name', 'website', 'organization_type', 'organization_sector', 'organization_email', 'organization_phone', 'municipality', 'locality'],
    };
    for (const key of required[tipoCuenta] ?? []) {
      if (!perfil[key]?.trim()) errors[key as keyof RegistroPayload] = 'Este dato es obligatorio para el tipo de cuenta seleccionado.';
    }
    if (tipoCuenta === 'organizacion' && perfil.organization_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(perfil.organization_email)) {
      errors.organization_email = 'Ingresa un correo de contacto válido.';
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrores({});
    setMensaje('');

    const nuevosErrores: RegistroErrors = {};
    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim();

    if (!nombreLimpio) {
      nuevosErrores.name = 'Ingresa tu nombre o razón social.';
    } else if (nombreLimpio.length > 255) {
      nuevosErrores.name = 'El nombre es demasiado largo.';
    }

    if (!tipoCuenta) {
      nuevosErrores.account_type = 'Selecciona un tipo de cuenta.';
    }

    if (!correoLimpio) {
      nuevosErrores.email = 'Ingresa tu correo electrónico.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)
    ) {
      nuevosErrores.email = 'Ingresa un correo electrónico válido.';
    } else if (correoLimpio.length > 255) {
      nuevosErrores.email = 'El correo es demasiado largo.';
    }

    if (!password) {
      nuevosErrores.password = 'Ingresa una contraseña.';
    } else if (password.length < 8) {
      nuevosErrores.password =
        'La contraseña debe tener al menos 8 caracteres.';
    }

    if (password && !confirmacion) {
      nuevosErrores.password_confirmation =
        'Confirma tu contraseña.';
    } else if (password && confirmacion !== password) {
      nuevosErrores.password_confirmation =
        'Las contraseñas no coinciden.';
    }

    validateProfileFields(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    const datos: RegistroPayload = {
      name: nombreLimpio,
      account_type: tipoCuenta,
      email: correoLimpio,
      password,
      password_confirmation: confirmacion,
      ...perfil,
      organization_id: perfil.organization_id ? Number(perfil.organization_id) : undefined,
      public_fields: publicFields,
      organization_public_fields: organizationPublicFields,
    };

    try {
      setProcesando(true);

      if (onRegister) {
        await onRegister(datos);
      } else {
        // Registro real con la API de Laravel
        await register(datos);
      }

      navigate(tipoCuenta === 'organizacion' ? '/mi-perfil?tipo=organizacion' : '/catalogo');
    } catch (err: unknown) {
      if (axios.isAxiosError<{ errors?: Record<string, string[]> }>(err) && err.response?.status === 422 && err.response.data.errors) {
        // Manejar errores de validación provenientes de Laravel
        const apiErrors = err.response.data.errors;
        const fieldErrors = Object.fromEntries(
          Object.entries(apiErrors).map(([key, messages]) => [key, messages[0]]),
        ) as RegistroErrors;
        setErrores({
          name: apiErrors.name ? apiErrors.name[0] : undefined,
          password: apiErrors.password ? apiErrors.password[0] : undefined,
          account_type: apiErrors.account_type ? apiErrors.account_type[0] : undefined,
          password_confirmation: apiErrors.password_confirmation ? apiErrors.password_confirmation[0] : undefined,
          ...fieldErrors,
          email: traducirErrorCorreo(apiErrors.email?.[0]),
        });
      } else {
        setErrores({
          general:
            'No fue posible completar el registro. Inténtalo nuevamente.',
        });
      }
    } finally {
      setProcesando(false);
    }
  }

  function renderProfileInput(key: keyof RegistroPayload, label: string, placeholder = '', type = 'text', required = true) {
    const error = errores[key];
    return (
      <div className="registro-field" key={key}>
        <label htmlFor={`registro-${key}`}>{label}</label>
        <input
          id={`registro-${key}`}
          type={type}
          value={perfil[key as string] ?? ''}
          onChange={(event) => setProfileField(key as string, event.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={255}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `registro-${key}-error` : undefined}
        />
        {error && <p className="registro-error" id={`registro-${key}-error`}>{error}</p>}
      </div>
    );
  }

  function renderInstitutionField() {
    const options = catalog.filter((item) => item.organization_type === 'institucion_educativa');
    const error = errores.institution;
    return (
      <div className="registro-field">
        <label htmlFor="registro-institution">Institución educativa</label>
        {!institutionManual ? (
          <select
            id="registro-institution"
            value={perfil.institution ?? ''}
            onChange={(event) => {
              if (event.target.value === '__other__') {
                setInstitutionManual(true);
                setProfileField('institution', '');
              } else setProfileField('institution', event.target.value);
            }}
            aria-invalid={Boolean(error)}
          >
            <option value="">Selecciona una institución</option>
            {options.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            <option value="__other__">No aparece en la lista</option>
          </select>
        ) : (
          <>
            <input
              id="registro-institution"
              value={perfil.institution ?? ''}
              onChange={(event) => setProfileField('institution', event.target.value)}
              placeholder="Escribe el nombre de tu institución"
              required
              maxLength={255}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'registro-institution-error' : undefined}
            />
            <button type="button" className="registro-login-link" onClick={() => { setInstitutionManual(false); setProfileField('institution', ''); }}>
              Elegir de la lista
            </button>
          </>
        )}
        {error && <p className="registro-error" id="registro-institution-error">{error}</p>}
      </div>
    );
  }

  function renderOrganizationField() {
    const options = catalog;
    const error = errores.organization_name;
    return (
      <div className="registro-field">
        <label htmlFor="registro-organization_name">Organización</label>
        {!organizationManual ? (
          <select
            id="registro-organization_name"
            value={organizationManual ? '__other__' : perfil.organization_id ?? ''}
            onChange={(event) => {
              if (event.target.value === '__other__') {
                setOrganizationManual(true);
                setProfileField('organization_name', '');
                setProfileField('organization_id', '');
              } else {
                const selected = options.find((item) => String(item.id) === event.target.value);
                setProfileField('organization_name', selected?.name ?? '');
                setProfileField('organization_id', selected ? String(selected.id) : '');
              }
            }}
            aria-invalid={Boolean(error)}
          >
            <option value="">Selecciona una organización</option>
            {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            <option value="__other__">No aparece en la lista</option>
          </select>
        ) : (
          <>
            <input
              id="registro-organization_name"
              value={perfil.organization_name ?? ''}
              onChange={(event) => setProfileField('organization_name', event.target.value)}
              placeholder="Nombre de la organización"
              required
              maxLength={255}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'registro-organization_name-error' : undefined}
            />
            <button type="button" className="registro-login-link" onClick={() => { setOrganizationManual(false); setProfileField('organization_name', ''); setProfileField('organization_id', ''); }}>
              Elegir de la lista
            </button>
          </>
        )}
        {error && <p className="registro-error" id="registro-organization_name-error">{error}</p>}
      </div>
    );
  }

  function renderConditionalProfileFields() {
    switch (tipoCuenta) {
      case 'estudiante':
        return <>
          {renderInstitutionField()}
          {renderProfileInput('campus', 'Campus o plantel')}
          {renderProfileInput('field_of_study', 'Carrera o programa')}
          <div className="registro-field">
            <label htmlFor="registro-semester">Semestre o periodo</label>
            <select id="registro-semester" value={perfil.semester ?? ''} onChange={(event) => setProfileField('semester', event.target.value)} required aria-invalid={Boolean(errores.semester)}>
              <option value="">Selecciona tu semestre</option>
              {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={String(index + 1)}>{index + 1}° semestre</option>)}
              <option value="egresado">Egresado/a</option>
            </select>
            {errores.semester && <p className="registro-error">{errores.semester}</p>}
          </div>
          {renderProfileInput('student_number', 'Matrícula')}
          {renderProfileInput('expected_graduation', 'Fecha estimada de egreso', '', 'month')}
        </>;
      case 'academico':
        return <>
          {renderInstitutionField()}
          <div className="registro-field">
            <label htmlFor="registro-academic_role">Actividad académica</label>
            <select id="registro-academic_role" value={perfil.academic_role ?? ''} onChange={(event) => setProfileField('academic_role', event.target.value)} required>
              <option value="">Selecciona una opción</option>
              <option value="docente">Docente</option>
              <option value="investigador">Investigador/a</option>
              <option value="ambos">Docente e investigador/a</option>
            </select>
          </div>
          {renderProfileInput('organization_area', 'Área, departamento o campo de investigación (opcional)', '', 'text', false)}
          {renderProfileInput('organization_position', 'Cargo o función (opcional)', '', 'text', false)}
        </>;
      case 'empleado_organizacion':
        return <>
          {renderOrganizationField()}
          {renderProfileInput('organization_area', 'Área o departamento')}
          {renderProfileInput('organization_position', 'Cargo o puesto')}
        </>;
      case 'residente_oaxaca':
        return <>
          {renderProfileInput('municipality', 'Municipio')}
          {renderProfileInput('locality', 'Barrio, colonia o comunidad')}
        </>;
      case 'organizacion':
        return <>
          {renderProfileInput('organization_name', 'Nombre público o razón social')}
          {renderProfileInput('legal_name', 'Razón social legal')}
          {renderProfileInput('website', 'Sitio web (URL)', 'https://ejemplo.org', 'url')}
          <div className="registro-field">
            <label htmlFor="registro-organization_type">Tipo de organización</label>
            <select id="registro-organization_type" value={perfil.organization_type ?? ''} onChange={(event) => setProfileField('organization_type', event.target.value)} required>
              <option value="">Selecciona el tipo</option>
              <option value="empresa">Empresa</option>
              <option value="institucion_educativa">Institución educativa</option>
              <option value="sector_social">Sector social</option>
            </select>
          </div>
          {renderProfileInput('organization_sector', 'Sector o actividad')}
          {renderProfileInput('municipality', 'Municipio')}
          {renderProfileInput('locality', 'Barrio, colonia o comunidad')}
          {renderProfileInput('organization_email', 'Correo de contacto', 'contacto@organizacion.org', 'email')}
          {renderProfileInput('organization_phone', 'Teléfono de contacto', '9511234567', 'tel')}
        </>;
      default:
        return null;
    }
  }

  return (
    <div className="registro-page">
      <header className="registro-header">
        <div className="registro-header-inner">
          <Link to="/" className="registro-logo">
            ProyectaTec
            <span className="registro-logo-dot" />
          </Link>

          <Link to="/" className="registro-volver">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <main className="registro-main">
        <div className="registro-intro">
          <div className="registro-eyebrow">
            PROYECTATEC / REGISTRO
          </div>

          <h1>Crear cuenta</h1>

          <p>
            Únete a la red de innovación y colaboración de Oaxaca.
          </p>
        </div>

        <div className="registro-grid">
          <section
            className="registro-card"
            aria-labelledby="registro-card-title"
          >
            <h2 id="registro-card-title">
              Información de la cuenta
            </h2>

            <form
              className="registro-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="registro-fields">
                {/* Nombre */}
                <div className="registro-field">
                  <label htmlFor="registro-nombre">
                    {tipoCuenta === 'organizacion' ? 'Nombre de la persona representante' : 'Nombre completo'}
                  </label>

                  <input
                    id="registro-nombre"
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Tu nombre completo"
                    value={nombre}
                    maxLength={255}
                    onChange={(event) =>
                      setNombre(event.target.value)
                    }
                    aria-invalid={Boolean(errores.name)}
                    aria-describedby={
                      errores.name ? 'registro-nombre-error' : undefined
                    }
                  />

                  {errores.name && (
                    <p
                      id="registro-nombre-error"
                      className="registro-error"
                    >
                      {errores.name}
                    </p>
                  )}
                </div>

                {/* Tipo de cuenta */}
                <div className="registro-field">
                  <label htmlFor="registro-tipo">
                    Tipo de cuenta
                  </label>

                  <select
                    id="registro-tipo"
                    name="account_type"
                    value={tipoCuenta}
                    onChange={(event) => {
                      setTipoCuenta(event.target.value);
                      setPerfil({});
                      setPublicFields([]);
                      setOrganizationPublicFields([]);
                      setInstitutionManual(false);
                      setOrganizationManual(false);
                      setErrores({});
                    }}
                    aria-invalid={Boolean(errores.account_type)}
                    aria-describedby={
                      errores.account_type
                        ? 'registro-tipo-error'
                        : undefined
                    }
                    className={!tipoCuenta ? 'registro-placeholder' : ''}
                  >
                    <option value="" disabled>
                      Empresa, institución educativa o sector social
                    </option>

                    {tiposCuenta.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>

                  {errores.account_type && (
                    <p
                      id="registro-tipo-error"
                      className="registro-error"
                    >
                      {errores.account_type}
                    </p>
                  )}
                </div>

                {tipoCuenta && (
                  <div className="registro-fields" aria-label="Datos del perfil según tipo de cuenta">
                    {renderConditionalProfileFields()}
                    {tipoCuenta !== 'organizacion' && renderProfileInput('phone', 'Teléfono de contacto (opcional)', '9511234567', 'tel', false)}
                  </div>
                )}

                {tipoCuenta && tipoCuenta !== 'organizacion' && (
                  <fieldset className="registro-fieldset">
                    <legend>Privacidad del perfil</legend>
                    <p>Estos datos son privados inicialmente. Marca cuáles quieres mostrar en tu perfil público.</p>
                    {[
                      ...(tipoCuenta === 'estudiante' ? [['institution', 'Institución'], ['field_of_study', 'Carrera o programa']] : []),
                      ...(tipoCuenta === 'academico' ? [['institution', 'Institución'], ['academic_role', 'Actividad académica']] : []),
                      ...(tipoCuenta === 'empleado_organizacion' ? [['organization_name', 'Organización'], ['organization_area', 'Área'], ['organization_position', 'Cargo']] : []),
                      ...(tipoCuenta === 'residente_oaxaca' ? [['location', 'Ubicación (municipio y colonia/comunidad)']] : []),
                      ['email', 'Correo electrónico'],
                      ['phone', 'Teléfono'],
                    ].map(([field, label]) => (
                      <label key={field} className="registro-checkbox">
                        <input
                          type="checkbox"
                          checked={publicFields.includes(field)}
                          onChange={(event) => setPublicFields((current) => event.target.checked
                            ? [...current, field]
                            : current.filter((item) => item !== field))}
                        />
                        Mostrar {label.toLocaleLowerCase()} en mi perfil público
                      </label>
                    ))}
                  </fieldset>
                )}

                {tipoCuenta === 'organizacion' && (
                  <fieldset className="registro-fieldset">
                    <legend>Privacidad de la organización</legend>
                    <p>Los datos de contacto y ubicación permanecen privados hasta que decidas publicarlos.</p>
                    {[
                      ['location', 'Ubicación'],
                      ['email', 'Correo de contacto'],
                      ['phone', 'Teléfono'],
                      ['classification', 'Tipo y sector de actividad'],
                    ].map(([field, label]) => (
                      <label key={field} className="registro-checkbox">
                        <input
                          type="checkbox"
                          checked={organizationPublicFields.includes(field)}
                          onChange={(event) => setOrganizationPublicFields((current) => event.target.checked
                            ? [...current, field]
                            : current.filter((item) => item !== field))}
                        />
                        Mostrar {label.toLocaleLowerCase()} en el perfil público
                      </label>
                    ))}
                  </fieldset>
                )}

                {/* Correo */}
                <div className="registro-field">
                  <label htmlFor="registro-correo">
                    Correo electrónico
                  </label>

                  <input
                    id="registro-correo"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    value={correo}
                    maxLength={255}
                    onChange={(event) =>
                      setCorreo(event.target.value)
                    }
                    aria-invalid={Boolean(errores.email)}
                    aria-describedby={
                      errores.email
                        ? 'registro-correo-error'
                        : undefined
                    }
                  />

                  {errores.email && (
                    <p
                      id="registro-correo-error"
                      className="registro-error"
                    >
                      {errores.email}
                    </p>
                  )}
                </div>

                {/* Contraseña */}
                <div className="registro-field">
                  <label htmlFor="registro-password">
                    Contraseña
                  </label>

                  <input
                    id="registro-password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Crear una contraseña"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    aria-invalid={Boolean(errores.password)}
                    aria-describedby={
                      errores.password
                        ? 'registro-password-error'
                        : undefined
                    }
                  />

                  {errores.password && (
                    <p
                      id="registro-password-error"
                      className="registro-error"
                    >
                      {errores.password}
                    </p>
                  )}
                </div>

                {/* Confirmación */}
                {(password.length > 0 ||
                  confirmacion.length > 0 ||
                  Boolean(errores.password_confirmation)) && (
                  <div className="registro-field">
                    <label htmlFor="registro-confirmacion">
                      Confirmar contraseña
                    </label>

                    <input
                      id="registro-confirmacion"
                      type="password"
                      name="password_confirmation"
                      autoComplete="new-password"
                      placeholder="Repite tu contraseña"
                      value={confirmacion}
                      onChange={(event) =>
                        setConfirmacion(event.target.value)
                      }
                      aria-invalid={Boolean(
                        errores.password_confirmation
                      )}
                      aria-describedby={
                        errores.password_confirmation
                          ? 'registro-confirmacion-error'
                          : undefined
                      }
                    />

                    {errores.password_confirmation && (
                      <p
                        id="registro-confirmacion-error"
                        className="registro-error"
                      >
                        {errores.password_confirmation}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="registro-bottom">
                {errores.general && (
                  <p className="registro-error" role="alert">
                    {errores.general}
                  </p>
                )}

                {mensaje && (
                  <p className="registro-notice" role="status">
                    {mensaje}
                  </p>
                )}

                <div className="registro-actions">
                  <button
                    type="submit"
                    className="registro-submit"
                    disabled={procesando}
                  >
                    {procesando ? 'Procesando...' : 'Crear cuenta'}
                  </button>

                  <Link to="/acceso" className="registro-login-link">
                    Ya tengo cuenta →
                  </Link>
                </div>
              </div>
            </form>
          </section>

          <aside className="registro-info-card">
            <h2>Un solo espacio para colaborar</h2>

            <p>
              El registro mantiene los mismos campos esenciales
              para empresas, instituciones educativas y
              organizaciones sociales.
            </p>
          </aside>
        </div>
      </main>

      <footer className="registro-footer">
        <span>
          © 2026 ProyectaTec · Instituto Tecnológico de Oaxaca
        </span>

        <span>Ayuda y privacidad</span>
      </footer>
    </div>
  );
}
