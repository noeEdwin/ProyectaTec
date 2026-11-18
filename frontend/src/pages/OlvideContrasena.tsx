import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import inicioSesionImage from '../assets/inicio_sesion.png';
import '../styles/acceso.css';

export default function OlvideContrasena() {
  const [email, setEmail] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMensaje('');

    const correo = email.trim();
    if (!correo) {
      setError('Ingresa tu correo electrónico.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    try {
      setProcesando(true);
      const { data } = await api.post<{ message: string }>('/forgot-password', { email: correo });
      setMensaje(
        data.message ||
          'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('No se pudo procesar la solicitud en este momento. Intenta de nuevo.');
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
            RECUPERACIÓN DE CUENTA
          </div>

          <h1 className="acceso-title">¿Olvidaste tu contraseña?</h1>

          <p className="acceso-subtitle">
            Ingresa el correo con el que te registraste y te enviaremos un enlace para restablecerla.
          </p>

          <form className="acceso-form" onSubmit={handleSubmit} noValidate>
            <div className="acceso-field">
              <label htmlFor="forgot-email">Correo electrónico</label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="nombre@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
              />
            </div>

            {error && (
              <p className="acceso-error" role="alert">
                {error}
              </p>
            )}

            {mensaje && (
              <p className="acceso-notice" role="status">
                {mensaje}
              </p>
            )}

            <button type="submit" className="acceso-submit" disabled={procesando}>
              {procesando ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
            </button>

            <p className="acceso-register">
              ¿Ya recordaste tu contraseña?{' '}
              <Link to="/acceso">Iniciar sesión</Link>
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
