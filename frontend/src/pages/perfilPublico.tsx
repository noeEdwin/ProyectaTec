import { useEffect, useState } from 'react';
import { getMyProfile, type UserProfile } from '../api/profileService';
import { useAuth } from '../context/auth-context';
import '../styles/perfil.css';

export default function PerfilPublico() {
  const { user } = useAuth();
  const [perfilReal, setPerfilReal] = useState<UserProfile | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mostrarContacto, setMostrarContacto] = useState(false);

  // Cargar datos reales desde la base de datos mediante /api/me/profile
  useEffect(() => {
    let activo = true;
    setCargando(true);
    setErrorCarga(false);

    void getMyProfile()
      .then((data) => {
        if (!activo) return;
        setPerfilReal(data);
      })
      .catch(() => {
        if (!activo) return;
        setErrorCarga(true);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Si está cargando
  if (cargando) {
    return (
      <div className="perfil-page">
        <div className="perfil-contenedor" style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ color: '#6b7280', fontSize: '15px' }}>Cargando información del perfil...</p>
        </div>
      </div>
    );
  }

  // Si ocurre un error al conectar con la API
  if (errorCarga) {
    return (
      <div className="perfil-page">
        <div className="perfil-contenedor" style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ color: '#b91c1c', fontSize: '15px' }} role="alert">No se pudo conectar con el servidor para obtener el perfil.</p>
        </div>
      </div>
    );
  }

  const nombreReal = perfilReal?.display_name || user?.name || 'Usuario ProyectaTec';
  const correoReal = perfilReal?.email || user?.email || 'Sin correo registrado';
  const ubicacionReal = perfilReal?.location || 'Ubicación no indicada';
  const descripcionReal = perfilReal?.description || '';

  return (
    <div className="perfil-page">
      <div className="perfil-contenedor">
        <div className="perfil-main">
          <div className="perfil-encabezado">
            <span className="perfil-etiqueta">PROYECTATEC / PERFIL PÚBLICO</span>
            <h1>Perfil público</h1>
            <p>Así se presenta tu cuenta real al resto del ecosistema.</p>
          </div>

          {/* Tarjeta resumen del perfil con nombre, ubicación y descripción */}
          <section className="perfil-resumen-card" style={{ padding: '2rem', background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#EFF6F7', color: '#0B4A54', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600, flexShrink: 0 }}>
                {getInitials(nombreReal)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1A202C', margin: 0 }}>{nombreReal}</h2>
                <p style={{ color: '#4A5568', fontSize: '15px', margin: 0 }}>{ubicacionReal}</p>
                {descripcionReal && (
                  <p style={{ color: '#4A5568', fontSize: '14px', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    {descripcionReal}
                  </p>
                )}
              </div>
            </div>

            {/* BOTÓN DE CONTACTAR CON INFORMACIÓN FLOTANTE */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setMostrarContacto(!mostrarContacto)}
                style={{
                  background: '#0B4A54',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                {mostrarContacto ? 'Ocultar contacto' : 'Contactar'}
              </button>

              {/* Ventana flotante (Popover) */}
              {mostrarContacto && (
                <div style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: '260px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#64748B' }}>CORREO DE CONTACTO</span>
                  <p style={{ fontSize: '14px', color: '#1E293B', fontWeight: 500, margin: 0, wordBreak: 'break-all' }}>{correoReal}</p>
                  <a
                    href={`mailto:${correoReal}`}
                    style={{
                      display: 'block',
                      marginTop: '6px',
                      textAlign: 'center',
                      background: '#F1F5F9',
                      color: '#0B4A54',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Enviar correo ↗
                  </a>
                </div>
              )}
            </div>
          </section>

          <section className="perfil-iniciativas">
            <h2>Iniciativas públicas</h2>
            <p className="perfil-sin-iniciativas">Tu cuenta está lista para colaborar en proyectos del Tecnológico de Oaxaca.</p>
          </section>
        </div>

        <footer className="perfil-footer">
          <span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span>
          <span>Ayuda y privacidad</span>
        </footer>
      </div>
    </div>
  );
}