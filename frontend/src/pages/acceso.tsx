import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import inicioSesionImage from '../assets/inicio_sesion.png';
import '../styles/acceso.css';

export type LoginPayload = {
  email: string;
  password: string;
  remember: boolean;
};

type AccesoProps = {
  onLogin?: (datos: LoginPayload) => Promise<void>;
};

const tiposUsuario = [
  'Estudiante',
  'Empresa / MIPYME',
  'Docente / asesor',
] as const;

export default function Acceso({ onLogin }: AccesoProps) {
  const [tipoUsuario, setTipoUsuario] = useState<string>('Estudiante');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [errores, setErrores] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const [mensaje, setMensaje] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrores({});
    setMensaje('');

    const nuevosErrores: typeof errores = {};
    const correo = email.trim();

    if (!correo) {
      nuevosErrores.email = 'Ingresa tu correo electrónico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      nuevosErrores.email = 'Ingresa un correo electrónico válido.';
    }

    if (!password) {
      nuevosErrores.password = 'Ingresa tu contraseña.';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    try {
      setProcesando(true);

      if (onLogin) {
        await onLogin({
          email: correo,
          password,
          remember: recordarme,
        });
      } else {
        // Conexión real con la API de Laravel Sanctum
        await login({ email: correo, password });
      }

      // Redirección al catálogo tras autenticación exitosa
      navigate('/catalogo');
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrores({ general: err.response.data.message });
      } else {
        setErrores({
          general: 'Credenciales incorrectas o problema de conexión con el servidor.',
        });
      }
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="acceso-page">
      <header className="acceso-header">
        <div className="acceso-header-inner">
          <Link to="/" className="acceso-logo">
            ProyectaTec<span className="acceso-logo-dot" />
          </Link>

          <Link to="/" className="acceso-volver">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <main className="acceso-main">
        <section className="acceso-form-section">
          <div className="acceso-eyebrow">
            <span className="acceso-eyebrow-line" />
            PORTAL DE ACCESO
          </div>

          <h1>
            Tu siguiente proyecto
            <br />
            comienza aquí.
          </h1>

          <p className="acceso-intro">
            Inicia sesión para explorar iniciativas, residencias
            y oportunidades de colaboración en Oaxaca.
          </p>

          <nav className="acceso-tabs" aria-label="Acceso a cuentas">
            <span className="acceso-tab acceso-tab-active">
              Iniciar sesión
            </span>

            <Link to="/registro" className="acceso-tab">
              Crear cuenta
            </Link>
          </nav>

          <form onSubmit={handleSubmit} noValidate>
            <fieldset className="acceso-fieldset">
              <legend>Tipo de Usuario</legend>

              <div className="acceso-tipos">
                {tiposUsuario.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    className={
                      tipoUsuario === tipo
                        ? 'acceso-tipo acceso-tipo-active'
                        : 'acceso-tipo'
                    }
                    aria-pressed={tipoUsuario === tipo}
                    onClick={() => setTipoUsuario(tipo)}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="acceso-field">
              <label htmlFor="acceso-email">
                Correo electrónico
              </label>

              <input
                id="acceso-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="usuario@itoaxaca.edu.mx"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errores.email)}
                aria-describedby={
                  errores.email ? 'acceso-email-error' : undefined
                }
              />

              {errores.email && (
                <p id="acceso-email-error" className="acceso-error">
                  {errores.email}
                </p>
              )}
            </div>

            <div className="acceso-field">
              <label htmlFor="acceso-password">
                Contraseña
              </label>

              <div className="acceso-password-wrapper">
                <input
                  id="acceso-password"
                  type={mostrarPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(errores.password)}
                  aria-describedby={
                    errores.password
                      ? 'acceso-password-error'
                      : undefined
                  }
                />

                <button
                  type="button"
                  className="acceso-mostrar"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={
                    mostrarPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {errores.password && (
                <p id="acceso-password-error" className="acceso-error">
                  {errores.password}
                </p>
              )}
            </div>

            <div className="acceso-options">
              <label className="acceso-remember">
                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(event) =>
                    setRecordarme(event.target.checked)
                  }
                />
                Mantener sesión iniciada
              </label>

              <button
                type="button"
                className="acceso-forgot"
                onClick={() =>
                  setMensaje(
                    'La recuperación de contraseña aún no está disponible.'
                  )
                }
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {errores.general && (
              <p className="acceso-error" role="alert">
                {errores.general}
              </p>
            )}

            {mensaje && (
              <p className="acceso-notice" role="status">
                {mensaje}
              </p>
            )}

            <button
              type="submit"
              className="acceso-submit"
              disabled={procesando}
            >
              {procesando ? 'Procesando...' : 'Iniciar sesión'}
            </button>
          </form>
        </section>

        <aside className="acceso-hero">
          <div className="acceso-hero-eyebrow">
            <span />
            ECOSISTEMA PROYECTATEC
          </div>

          <div className="acceso-image-frame">
            <img
              src={inicioSesionImage}
              alt="Estudiantes y profesionales colaborando en Oaxaca"
            />
          </div>

          <div className="acceso-hero-description">
            <h2>
              Talento que conecta
              <br />
              con oportunidades.
            </h2>

            <p>
              Impulsamos la colaboración entre estudiantes,
              empresas y docentes de Oaxaca.
            </p>
          </div>
        </aside>
      </main>

      <footer className="acceso-footer">
        © 2026 ProyectaTec · Instituto Tecnológico de Oaxaca
      </footer>
    </div>
  );
}