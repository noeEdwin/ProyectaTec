import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { getMyProfile, type UserProfile } from '../api/profileService';
import '../styles/perfil.css';

export default function PerfilPublico() {
  const { user } = useAuth();
  const [mostrarContacto, setMostrarContacto] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getMyProfile().then((data) => { if (active) setProfile(data); }).catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const nombreReal = profile?.display_name || user?.name || 'Usuario ProyectaTec';
  const correoPublico = profile?.public_fields?.includes('email') ? profile.email : null;
  const telefonoPublico = profile?.public_fields?.includes('phone') ? profile.phone : null;
  const ubicacionPublica = profile?.public_fields?.includes('location')
    ? profile.location || 'Ubicación no indicada'
    : 'Ubicación reservada';
  const clasificacionPublica = [
    ...(profile?.public_fields?.includes('institution') ? [profile.institution] : []),
    ...(profile?.public_fields?.includes('field_of_study') ? [profile.field_of_study] : []),
    ...(profile?.public_fields?.includes('academic_role') ? [profile.academic_role] : []),
    ...(profile?.public_fields?.includes('organization_name') ? [profile.organization_name] : []),
    ...(profile?.public_fields?.includes('organization_area') ? [profile.organization_area] : []),
    ...(profile?.public_fields?.includes('organization_position') ? [profile.organization_position] : []),
  ].filter(Boolean).join(' · ');
  const tipoCuentaReal = profile?.account_type === 'organizacion' || user?.account_type === 'organizacion'
    ? 'Organización'
    : profile?.account_type === 'academico' ? 'Personal académico'
      : profile?.account_type === 'empleado_organizacion' ? 'Empleado de organización'
        : profile?.account_type === 'residente_oaxaca' ? 'Persona de Oaxaca' : 'Estudiante';

  return (
    <div className="perfil-page">
      <div className="perfil-contenedor">
        <div className="perfil-main">
          <div className="perfil-encabezado">
            <span className="perfil-etiqueta">PROYECTATEC / PERFIL PÚBLICO</span>
            <h1>Perfil público</h1>
            <p>Así se presenta tu cuenta real al resto del ecosistema.</p>
          </div>

          {/* Tarjeta resumen del perfil */}
          <section className="perfil-resumen-card" style={{ padding: '2rem', background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#EFF6F7', color: '#0B4A54', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600 }}>
                {getInitials(nombreReal)}
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>{nombreReal}</h2>
                <p style={{ color: '#4A5568', fontSize: '15px', marginBottom: '8px' }}>{ubicacionPublica}</p>
                <span style={{ display: 'inline-block', padding: '4px 12px', background: '#EDF2F7', color: '#2D3748', borderRadius: '999px', fontSize: '13px', fontWeight: 500 }}>
                  {tipoCuentaReal}
                </span>
              </div>
            </div>

            {clasificacionPublica && <p>{clasificacionPublica}</p>}

            {(correoPublico || telefonoPublico) && <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setMostrarContacto(!mostrarContacto)}
                style={{
                  background: '#0B4A54',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
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
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#64748B' }}>CONTACTO PÚBLICO</span>
                  {correoPublico && <p style={{ fontSize: '14px', color: '#1E293B', fontWeight: 500, margin: 0, wordBreak: 'break-all' }}>{correoPublico}</p>}
                  {telefonoPublico && <p style={{ fontSize: '14px', color: '#1E293B', fontWeight: 500, margin: 0 }}>{telefonoPublico}</p>}
                  {correoPublico && <a
                    href={`mailto:${correoPublico}`}
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
                  </a>}
                </div>
              )}
            </div>}
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
