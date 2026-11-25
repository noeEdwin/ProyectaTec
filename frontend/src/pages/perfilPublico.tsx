import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import {
  getMyProfile,
  getPublicProfile,
  type PublicUserProfile,
  type UserProfile,
} from '../api/profileService';
import '../styles/perfil.css';

function etiquetaTipoCuenta(tipo?: string | null): string {
  switch (tipo) {
    case 'organizacion':
      return 'Organización';
    case 'academico':
    case 'docente':
      return 'Personal académico';
    case 'empleado_organizacion':
      return 'Empleado de organización';
    case 'residente_oaxaca':
      return 'Persona de Oaxaca';
    case 'estudiante':
    case 'student':
      return 'Estudiante';
    default:
      return 'Integrante ProyectaTec';
  }
}

function getInitials(name?: string | null): string {
  if (!name) return 'US';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function PerfilPublico() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const esTercero = Boolean(id);
  const [mostrarContacto, setMostrarContacto] = useState(false);
  const [ownProfile, setOwnProfile] = useState<UserProfile | null>(null);
  const [estadoTercero, setEstadoTercero] = useState<{
    loadedId: string | null;
    profile: PublicUserProfile | null;
    error: string | null;
  }>({ loadedId: null, profile: null, error: null });

  useEffect(() => {
    let active = true;

    if (id) {
      void getPublicProfile(id)
        .then((data) => {
          if (active) {
            setEstadoTercero({ loadedId: id, profile: data, error: null });
          }
        })
        .catch(() => {
          if (active) {
            setEstadoTercero({
              loadedId: id,
              profile: null,
              error: 'No se encontró el perfil público solicitado o ya no está disponible.',
            });
          }
        });
      return () => {
        active = false;
      };
    }

    if (!user) return;
    void getMyProfile()
      .then((data) => {
        if (active) setOwnProfile(data);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [id, user]);

  const cargando = Boolean(id) && estadoTercero.loadedId !== id;
  const publicProfile = id && estadoTercero.loadedId === id ? estadoTercero.profile : null;
  const error = id && estadoTercero.loadedId === id ? estadoTercero.error : null;

  const nombreReal = esTercero
    ? publicProfile?.display_name || 'Perfil público'
    : ownProfile?.display_name || user?.name || 'Usuario ProyectaTec';

  const imagenUrl = esTercero ? publicProfile?.image_url : ownProfile?.image_url;

  const correoPublico = esTercero
    ? publicProfile?.contact?.email || null
    : ownProfile?.public_fields?.includes('email')
      ? ownProfile.email || null
      : null;

  const telefonoPublico = esTercero
    ? publicProfile?.contact?.phone || null
    : ownProfile?.public_fields?.includes('phone')
      ? ownProfile.phone || null
      : null;

  const ubicacionPublica = esTercero
    ? publicProfile?.location || 'Ubicación reservada'
    : ownProfile?.public_fields?.includes('location')
      ? ownProfile.location || 'Ubicación no indicada'
      : 'Ubicación reservada';

  const clasificacionPublica = esTercero
    ? publicProfile?.classification?.trim() || ''
    : [
        ...(ownProfile?.public_fields?.includes('institution') ? [ownProfile.institution] : []),
        ...(ownProfile?.public_fields?.includes('field_of_study') ? [ownProfile.field_of_study] : []),
        ...(ownProfile?.public_fields?.includes('academic_role') ? [ownProfile.academic_role] : []),
        ...(ownProfile?.public_fields?.includes('organization_name') ? [ownProfile.organization_name] : []),
        ...(ownProfile?.public_fields?.includes('organization_area') ? [ownProfile.organization_area] : []),
        ...(ownProfile?.public_fields?.includes('organization_position') ? [ownProfile.organization_position] : []),
      ]
        .filter(Boolean)
        .join(' · ');

  const descripcionPublica = esTercero
    ? publicProfile?.description?.trim() || ''
    : ownProfile?.description?.trim() || '';

  const areasPublicas = esTercero
    ? publicProfile?.interest_areas || []
    : ownProfile?.public_fields?.includes('interest_areas')
      ? ownProfile.interest_areas || []
      : [];

  const tipoCuentaReal = etiquetaTipoCuenta(
    esTercero ? publicProfile?.account_type : ownProfile?.account_type || user?.account_type,
  );

  return (
    <div className="perfil-page">
      <div className="perfil-contenedor">
        <div className="perfil-main">
          <div className="perfil-encabezado">
            <span className="perfil-etiqueta">PROYECTATEC / PERFIL PÚBLICO</span>
            <h1>{esTercero ? nombreReal : 'Perfil público'}</h1>
            <p>
              {esTercero
                ? 'Información pública compartida por esta persona en el ecosistema ProyectaTec.'
                : 'Así se presenta tu cuenta real al resto del ecosistema.'}
            </p>
            {esTercero && (
              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  style={{
                    background: 'transparent',
                    color: '#0B4A54',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Volver
                </button>
              </div>
            )}
          </div>

          {cargando ? (
            <section
              className="perfil-resumen-card"
              style={{
                padding: '2rem',
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                marginBottom: '2rem',
              }}
            >
              <p style={{ margin: 0, color: '#475569' }}>Cargando perfil público...</p>
            </section>
          ) : error ? (
            <section
              className="perfil-resumen-card"
              style={{
                padding: '2rem',
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #FECACA',
                marginBottom: '2rem',
              }}
            >
              <h2 style={{ marginTop: 0, color: '#991B1B', fontSize: '20px' }}>Perfil no disponible</h2>
              <p style={{ color: '#475569' }}>{error}</p>
              <Link to="/catalogo" style={{ color: '#0B4A54', fontWeight: 600 }}>
                Explorar iniciativas →
              </Link>
            </section>
          ) : (
            <>
              {/* Tarjeta resumen del perfil */}
              <section
                className="perfil-resumen-card"
                style={{
                  padding: '2rem',
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#EFF6F7',
                      color: '#0B4A54',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {imagenUrl ? (
                      <img
                        src={imagenUrl}
                        alt={nombreReal}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      getInitials(nombreReal)
                    )}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>
                      {nombreReal}
                    </h2>
                    <p style={{ color: '#4A5568', fontSize: '15px', marginBottom: '8px' }}>{ubicacionPublica}</p>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        background: '#EDF2F7',
                        color: '#2D3748',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {tipoCuentaReal}
                    </span>
                  </div>
                </div>

                {clasificacionPublica && (
                  <p style={{ margin: 0, color: '#334155', fontWeight: 500 }}>{clasificacionPublica}</p>
                )}

                {(correoPublico || telefonoPublico) && (
                  <div style={{ position: 'relative' }}>
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
                      {mostrarContacto
                        ? 'Ocultar contacto público'
                        : esTercero
                          ? 'Ver contacto público'
                          : 'Ver contacto público'}
                    </button>

                    {mostrarContacto && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '120%',
                          right: 0,
                          width: '260px',
                          maxWidth: 'calc(100vw - 32px)',
                          background: '#ffffff',
                          borderRadius: '10px',
                          boxShadow:
                            '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #E2E8F0',
                          padding: '16px',
                          zIndex: 50,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            color: '#64748B',
                          }}
                        >
                          {esTercero ? 'CONTACTO PÚBLICO' : 'CONTACTO PÚBLICO (VISTA PREVIA)'}
                        </span>
                        {correoPublico && (
                          <p
                            style={{
                              fontSize: '14px',
                              color: '#1E293B',
                              fontWeight: 500,
                              margin: 0,
                              wordBreak: 'break-all',
                            }}
                          >
                            {correoPublico}
                          </p>
                        )}
                        {telefonoPublico && (
                          <p style={{ fontSize: '14px', color: '#1E293B', fontWeight: 500, margin: 0 }}>
                            {telefonoPublico}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {descripcionPublica && (
                <section className="perfil-iniciativas" aria-label="Acerca de">
                  <h2>Acerca de</h2>
                  <p style={{ whiteSpace: 'pre-line', color: '#334155', lineHeight: 1.6 }}>
                    {descripcionPublica}
                  </p>
                </section>
              )}

              {areasPublicas.length > 0 && (
                <section className="perfil-iniciativas" aria-label="Áreas de interés públicas">
                  <h2>Áreas de interés</h2>
                  <p>{areasPublicas.join(' · ')}</p>
                </section>
              )}

              {!esTercero && (
                <section className="perfil-iniciativas">
                  <h2>Iniciativas públicas</h2>
                  <p className="perfil-sin-iniciativas">
                    Tu cuenta está lista para colaborar en proyectos del Tecnológico de Oaxaca.
                  </p>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="perfil-footer">
          <span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span>
          <span>Ayuda y privacidad</span>
        </footer>
      </div>
    </div>
  );
}
