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
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError('Has realizado varios intentos seguidos. Espera un minuto antes de solicitar otro enlace.');
      } else if (axios.isAxiosError(err) && err.response?.data?.message) {
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

          <h1>¿Olvidaste tu contraseña?</h1>

          <p className="acceso-intro">
            Ingresa el correo con el que te registraste y te enviaremos un enlace temporal
            para restablecer el acceso a tu cuenta.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <p className="form-leyenda-obligatorios">
              Los campos marcados con <span className="campo-obligatorio">*</span> son obligatorios.
            </p>
            <div className="acceso-field">
              <label htmlFor="forgot-email">
                Correo electrónico<span className="campo-obligatorio" aria-hidden="true">*</span>
              </label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="usuario@itoaxaca.edu.mx"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
              />
              {email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                <p className="formato-ayuda invalido">
                  Formato esperado: usuario@dominio.com (incluye @ y dominio).
                </p>
              )}
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
                  Revisa tu bandeja de entrada y tu carpeta de spam. Si necesitas otro enlace,
                  espera al menos 1 minuto antes de volver a solicitarlo.
                </p>
              </div>
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

        <aside className="acceso-hero" aria-hidden="true">
          <div className="acceso-hero-eyebrow">
            <span />
            ACCESO SEGURO
          </div>

          <div className="acceso-image-frame">
            <img
              src={inicioSesionImage}
              alt="Estudiantes y profesionales colaborando en Oaxaca"
            />
          </div>

          <div className="acceso-hero-description">
            <h2>
              Recupera el acceso
              <br />
              en pocos minutos.
            </h2>

            <p>
              El enlace enviado a tu correo es de un solo uso y tiene vigencia de 60 minutos
              para proteger tu cuenta en ProyectaTec.
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
