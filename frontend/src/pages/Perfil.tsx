import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProfile, updateMyProfile, type UserProfile } from '../api/profileService';
import { useAuth } from '../context/AuthContext';

export default function Perfil() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile>({
    display_name: '',
    description: '',
    phone: '',
    location: '',
    institution: '',
    field_of_study: '',
    account_type: '',
    email: '',
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMyProfile();
      setProfile({
        display_name: data.display_name || user?.name || '',
        description: data.description || '',
        phone: data.phone || '',
        location: data.location || '',
        institution: data.institution || '',
        field_of_study: data.field_of_study || '',
        account_type: data.account_type || user?.account_type || 'Empresa, institución educativa o sector social',
        email: data.email || user?.email || '',
      });
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationErrors({});

    try {
      const res = await updateMyProfile({
        display_name: profile.display_name,
        description: profile.description,
        phone: profile.phone,
        location: profile.location,
        institution: profile.institution,
        field_of_study: profile.field_of_study,
      });
      if (res) {
        setSuccessMessage('¡Perfil guardado exitosamente!');
      }
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleApiError = (error: any) => {
    if (!error.response) {
      setErrorMessage('Error de conexión con el servidor. Verifica tu red.');
      return;
    }

    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 401:
        navigate('/acceso');
        break;
      case 403:
        setErrorMessage('No tienes permisos para modificar este perfil.');
        break;
      case 404:
        setErrorMessage('El perfil solicitado no fue encontrado.');
        break;
      case 422:
        setValidationErrors(data.errors || {});
        setErrorMessage('Por favor corrige los campos indicados.');
        break;
      default:
        setErrorMessage(data.message || 'Ocurrió un error inesperado.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
        Cargando datos del perfil...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1140px', margin: '2.5rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Encabezado e Identidad ProyectaTec */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-block',
          borderBottom: '3px solid #f59e0b',
          paddingBottom: '2px',
          marginBottom: '0.75rem'
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#b45309',
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}>
            PROYECTATEC / EDITAR PERFIL
          </span>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Editar perfil
        </h1>

        <p style={{ fontSize: '16px', color: '#64748b', marginTop: '0.5rem' }}>
          Actualiza los datos que verán otros participantes de ProyectaTec.
        </p>
      </div>

      {/* Retroalimentación de API */}
      {errorMessage && (
        <div style={{
          background: '#fee2e2', color: '#b91c1c', padding: '0.875rem 1.25rem',
          borderRadius: '10px', marginBottom: '1.5rem', fontSize: '14px', fontWeight: 500
        }}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{
          background: '#dcfce7', color: '#15803d', padding: '0.875rem 1.25rem',
          borderRadius: '10px', marginBottom: '1.5rem', fontSize: '14px', fontWeight: 500
        }}>
          {successMessage}
        </div>
      )}

      {/* Grid de 2 Columnas (Figma Layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Tarjeta Izquierda: Formulario */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem' }}>
            Datos de tu perfil
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Nombre o razón social */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Nombre o razón social
              </label>
              <input
                type="text"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Centro de Innovación Oaxaca"
                required
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {validationErrors.display_name && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {validationErrors.display_name[0]}
                </span>
              )}
            </div>

            {/* Tipo de cuenta */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Tipo de cuenta
              </label>
              <input
                type="text"
                value={profile.account_type || ''}
                onChange={(e) => setProfile({ ...profile, account_type: e.target.value })}
                placeholder="Empresa, institución educativa o sector social"
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Correo de contacto */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Correo de contacto
              </label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="contacto@ejemplo.com"
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Descripción breve */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Descripción breve
              </label>
              <textarea
                rows={3}
                value={profile.description || ''}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Describe tu actividad e intereses"
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: '999px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  padding: '0.75rem 1.75rem',
                  borderRadius: '999px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>

          </form>
        </div>

        {/* Tarjeta Derecha: Vista pública */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
            Vista pública
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '1.75rem' }}>
            Esta información aparecerá en tu perfil público. La disposición es igual para todos los tipos de cuenta.
          </p>

          <button
            type="button"
            onClick={() => navigate('/catalogo')}
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              borderRadius: '999px',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Ver perfil público
          </button>
        </div>

      </div>
    </div>
  );
}