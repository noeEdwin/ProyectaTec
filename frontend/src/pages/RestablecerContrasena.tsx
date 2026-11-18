import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { validarContrasenaSegura } from '../utils/passwordValidation';
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (!token) {
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

          <h1 className="acceso-title">Restablecer contraseña</h1>

          <p className="acceso-subtitle">
            Define una nueva contraseña de al menos 8 caracteres para tu cuenta.
          </p>

          <form className="acceso-form" onSubmit={handleSubmit} noValidate>
            <div className="acceso-field">
              <label htmlFor="reset-email">Correo electrónico</label>
              <input
                id="reset-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="nombre@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="acceso-field">
              <label htmlFor="reset-password">Nueva contraseña</label>
              <div className="acceso-password-wrapper">
                <input
                  id="reset-password"
                  type={mostrarPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
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
            </div>

            <div className="acceso-field">
              <label htmlFor="reset-password-confirmation">Confirmar contraseña</label>
              <input
                id="reset-password-confirmation"
                type={mostrarPassword ? 'text' : 'password'}
                name="password_confirmation"
                autoComplete="new-password"
                placeholder="Repite tu nueva contraseña"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </div>

            {error && (
              <p className="acceso-error" role="alert">
                {error}
              </p>
            )}

            {mensaje && (
              <p className="acceso-notice" role="status">
                {mensaje}{' '}
                <Link to="/acceso" style={{ fontWeight: 700, color: '#0f4c5c' }}>
                  Ir a iniciar sesión →
                </Link>
              </p>
            )}

            <button type="submit" className="acceso-submit" disabled={procesando || Boolean(mensaje)}>
              {procesando ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>

            <p className="acceso-register">
              ¿Necesitas otro enlace?{' '}
              <Link to="/olvide-contrasena">Solicitar recuperación</Link>
            </p>
          </form>
        </section>

        <section className="acceso-visual-section" aria-hidden="true">
          <div className="acceso-visual-card">
            <img
              src={inicioSesionImage}
              alt="Colaboración en ProyectaTec"
              className="acceso-visual-image"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
