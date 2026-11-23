import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { validarContrasenaSegura } from '../utils/passwordValidation';
import PasswordChecklist from '../components/PasswordChecklist';
import inicioSesionImage from '../assets/inicio_sesion.png';
import '../styles/acceso.css';

export default function RestablecerContrasena() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const initialEmail = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const tokenFaltante = !token.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (tokenFaltante) {
      setError('El enlace de recuperación no incluye un token válido. Solicita uno nuevo.');
      return;
    }

    const correo = email.trim();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    const errorPassword = validarContrasenaSegura(password);
    if (errorPassword) {
      setError(errorPassword);
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setProcesando(true);
      const { data } = await api.post<{ message: string }>('/reset-password', {
        token,
        email: correo,
        password,
        password_confirmation: passwordConfirmation,
      });

      setMensaje(data.message || 'Tu contraseña se restableció correctamente.');
      setPassword('');
      setPasswordConfirmation('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          setError('Demasiados intentos seguidos. Espera un momento antes de volver a intentarlo.');
          return;
        }
        const apiErrors = err.response?.data?.errors as Record<string, string[]> | undefined;
        const firstFieldError = apiErrors ? Object.values(apiErrors).flat()[0] : undefined;
        setError(
          firstFieldError ||
            err.response?.data?.message ||
            'No se pudo restablecer la contraseña. Solicita un nuevo enlace.'
        );
      } else {
        setError('Error de conexión con el servidor.');
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

          <Link to="/acceso" className="acceso-volver">
            ← Volver a acceso
          </Link>
        </div>
      </header>

      <main className="acceso-main">
        <section className="acceso-form-section">
          <div className="acceso-eyebrow">
            <span className="acceso-eyebrow-line" />
            NUEVA CONTRASEÑA
          </div>

          <h1>Restablecer contraseña</h1>

          <p className="acceso-intro">
            Define una nueva contraseña segura para recuperar el acceso a tu cuenta.
          </p>

          {tokenFaltante && (
            <div className="acceso-warning" role="alert">
              <strong>Enlace incompleto o inválido.</strong>
              <p>
                Abre el enlace directamente desde tu correo electrónico o{' '}
                <Link to="/olvide-contrasena">solicita un nuevo enlace de recuperación</Link>.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <p className="form-leyenda-obligatorios">
              Los campos marcados con <span className="campo-obligatorio">*</span> son obligatorios.
            </p>
            <div className="acceso-field">
              <label htmlFor="reset-email">
                Correo electrónico<span className="campo-obligatorio" aria-hidden="true">*</span>
              </label>
              <input
                id="reset-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="usuario@itoaxaca.edu.mx"
                value={email}
                readOnly={Boolean(initialEmail)}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="acceso-field">
              <label htmlFor="reset-password">
                Nueva contraseña<span className="campo-obligatorio" aria-hidden="true">*</span>
              </label>
              <div className="acceso-password-wrapper">
                <input
                  id="reset-password"
                  type={mostrarPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Mín. 8 caracteres, mayús., minús., número y símbolo"
                  value={password}
                  disabled={tokenFaltante || Boolean(mensaje)}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="acceso-mostrar"
                  onClick={() => setMostrarPassword((prev) => !prev)}
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <PasswordChecklist
                password={password}
                confirmation={passwordConfirmation}
                showConfirmationCheck={passwordConfirmation.length > 0}
              />
            </div>

            <div className="acceso-field">
              <label htmlFor="reset-password-confirmation">
                Confirmar contraseña<span className="campo-obligatorio" aria-hidden="true">*</span>
              </label>
              <input
                id="reset-password-confirmation"
                type={mostrarPassword ? 'text' : 'password'}
                name="password_confirmation"
                autoComplete="new-password"
                placeholder="Repite tu nueva contraseña"
                value={passwordConfirmation}
                disabled={tokenFaltante || Boolean(mensaje)}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </div>

            {error && (
              <p className="acceso-error acceso-alert-block" role="alert">
                {error}
              </p>
            )}

            {mensaje && (
              <div className="acceso-notice" role="status">
                <strong>{mensaje}</strong>
                <p>
                  <Link to="/acceso" className="acceso-notice-link">
                    Ir a iniciar sesión →
                  </Link>
                </p>
              </div>
            )}

            <button
              type="submit"
              className="acceso-submit"
              disabled={procesando || tokenFaltante || Boolean(mensaje)}
            >
              {procesando ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>

            <p className="acceso-register">
              ¿Necesitas otro enlace?{' '}
              <Link to="/olvide-contrasena">Solicitar recuperación</Link>
            </p>
          </form>
        </section>

        <aside className="acceso-hero" aria-hidden="true">
          <div className="acceso-hero-eyebrow">
            <span />
            PROTECCIÓN DE CUENTA
          </div>

          <div className="acceso-image-frame">
            <img
              src={inicioSesionImage}
              alt="Estudiantes y profesionales colaborando en Oaxaca"
            />
          </div>

          <div className="acceso-hero-description">
            <h2>
              Tu cuenta siempre
              <br />
              bajo tu control.
            </h2>

            <p>
              Al guardar tu nueva contraseña cerraremos las sesiones anteriores en otros dispositivos
              por tu seguridad.
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
