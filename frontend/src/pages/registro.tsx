import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/registro.css';

export type RegistroPayload = {
  name: string;
  account_type: string;
  email: string;
  password: string;
  password_confirmation: string;
};

type RegistroProps = {
  onRegister?: (datos: RegistroPayload) => Promise<void>;
};

type RegistroErrors = Partial<
  Record<keyof RegistroPayload | 'general', string>
>;

const tiposCuenta = [
  { value: 'empresa', label: 'Empresa / MIPYME' },
  {
    value: 'institucion_educativa',
    label: 'Institución educativa',
  },
  {
    value: 'sector_social',
    label: 'Comunidad / sector social',
  },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'docente', label: 'Docente / asesor' },
];

export default function Registro({ onRegister }: RegistroProps) {
  const [nombre, setNombre] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  const [errores, setErrores] = useState<RegistroErrors>({});
  const [mensaje, setMensaje] = useState('');
  const [procesando, setProcesando] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

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
    };

    try {
      setProcesando(true);

      if (onRegister) {
        await onRegister(datos);
      } else {
        // Registro real con la API de Laravel
        await register(datos);
      }

      navigate('/catalogo');
    } catch (err: any) {
      if (err.response?.status === 422 && err.response.data.errors) {
        // Manejar errores de validación provenientes de Laravel
        const apiErrors = err.response.data.errors;
        setErrores({
          name: apiErrors.name ? apiErrors.name[0] : undefined,
          email: apiErrors.email ? apiErrors.email[0] : undefined,
          password: apiErrors.password ? apiErrors.password[0] : undefined,
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
                    Nombre o razón social
                  </label>

                  <input
                    id="registro-nombre"
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Tu nombre o el de tu organización"
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
                    onChange={(event) =>
                      setTipoCuenta(event.target.value)
                    }
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