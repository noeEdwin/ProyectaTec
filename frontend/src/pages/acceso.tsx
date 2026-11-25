import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
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

export default function Acceso({ onLogin }: AccesoProps) {
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

  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cuentasDemo = [
    { etiqueta: 'Administrador', email: 'admin.demo@proyectatec.test' },
    { etiqueta: 'Estudiante', email: 'estudiante.demo@proyectatec.test' },
    { etiqueta: 'Docente', email: 'docente.demo@proyectatec.test' },
    { etiqueta: 'Empleado', email: 'empleado.demo@proyectatec.test' },
    { etiqueta: 'Comunidad', email: 'comunidad.demo@proyectatec.test' },
    { etiqueta: 'Organización', email: 'organizacion.demo@proyectatec.test' },
    { etiqueta: 'Dueño ITO', email: 'ito.demo@proyectatec.test' },
  ];

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

      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith('/') && !from.startsWith('//') ? from : '/iniciativas', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const apiMsg = err.response?.data?.message;
        if (status === 429 || apiMsg === 'Too Many Attempts.') {
          setErrores({ general: 'Demasiados intentos. Espera un minuto antes de volver a intentarlo.' });
        } else if (apiMsg) {
          setErrores({ general: apiMsg });
        } else {
          setErrores({
            general: 'Credenciales incorrectas o problema de conexión con el servidor.',
          });
        }
      } else {
        setErrores({
          general: 'Credenciales incorrectas o problema de conexión con el servidor.',
        });
      }
    } finally {
      setProcesando(false);
    }
  }

  if (!onLogin && !loading && user) {
    return <Navigate to="/iniciativas" replace />;
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
            <p className="form-leyenda-obligatorios">
              Los campos marcados con <span className="campo-obligatorio">*</span> son obligatorios.
            </p>
            <div className="acceso-field">
              <label htmlFor="acceso-email">
                Correo electrónico<span className="campo-obligatorio" aria-hidden="true">*</span>
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
                Contraseña<span className="campo-obligatorio" aria-hidden="true">*</span>
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

              <Link to="/olvide-contrasena" className="acceso-forgot">
                ¿Olvidaste tu contraseña?
              </Link>
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
          {(import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true') && (
            <aside className="acceso-demo" aria-label="Cuentas de demostración">
              <strong>Prueba con una cuenta demo</strong>
              <p>Selecciona un perfil para llenar el acceso. Contraseña común: <code>ProyectaTecDemo2026!</code></p>
              <div>
                {cuentasDemo.map((cuenta) => (
                  <button
                    key={cuenta.email}
                    type="button"
                    onClick={() => {
                      setEmail(cuenta.email);
                      setPassword('ProyectaTecDemo2026!');
                      setErrores({});
                    }}
                  >
                    {cuenta.etiqueta}
                  </button>
                ))}
              </div>
            </aside>
          )}
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
