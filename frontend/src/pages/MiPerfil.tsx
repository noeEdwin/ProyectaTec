import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getMyOrganizations, getMyProfile } from '../api/profileService';
import type { UserProfile, OrganizationAccess } from '../api/profileService';
import { obtenerTipoPerfil } from '../context/perfil-context';
import { useAuth } from '../context/auth-context';
import '../styles/perfilEspacio.css';

// Etiquetas legibles para cada tipo de cuenta (incluye el valor antiguo 'empresa/MIPYME')
const ETIQUETAS_TIPO_CUENTA: Record<string, string> = {
  empresa: 'Empresa / MIPYME',
  'empresa/MIPYME': 'Empresa / MIPYME',
  institucion_educativa: 'Institución educativa',
  sector_social: 'Comunidad / sector social',
  estudiante: 'Estudiante',
  docente: 'Docente / asesor',
};

// Las áreas de interés se guardan en field_of_study separadas por coma
function separarAreas(valor?: string | null): string[] {
  if (!valor) return [];
  return valor
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean);
}

export default function MiPerfil() {
  const [busqueda] = useSearchParams();
  const tipo = obtenerTipoPerfil(busqueda.get('tipo'));
  const { user } = useAuth();

  const [perfilReal, setPerfilReal] = useState<UserProfile | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [canEditOrganization, setCanEditOrganization] = useState(false);

  // Función para obtener las dos iniciales del avatar
  const obtenerDosIniciales = (nombre?: string) => {
    if (!nombre) return 'US';
    const palabras = nombre.trim().split(/\s+/);
    if (palabras.length >= 2) {
      return (palabras[0][0] + palabras[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  // Actividades dinámicas según el rol
  const actividades = tipo === 'organizacion'
    ? ['Actualización de una iniciativa', 'Nueva solicitud de colaboración']
    : ['Participación en una iniciativa', 'Nueva actividad de colaboración'];

  // Cargar datos reales desde la base de datos
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

  // Verificar permisos de organizaciones vinculadas
  useEffect(() => {
    if (tipo !== 'organizacion') return;

    let activo = true;
    void getMyOrganizations()
      .then((organizations: OrganizationAccess[]) => {
        if (activo) setCanEditOrganization(organizations.some((org) => org.can_update));
      })
      .catch(() => {
        if (activo) setCanEditOrganization(false);
      });

    return () => {
      activo = false;
    };
  }, [tipo]);

  const canEdit = tipo !== 'organizacion';

  // Se conserva el ?tipo= al ir a Editar perfil para poder regresar a la misma vista
  const tipoParam = busqueda.get('tipo');
  const rutaEditar = tipoParam
    ? `/perfil?tipo=${encodeURIComponent(tipoParam)}`
    : '/perfil';

  // Si está cargando
  if (cargando) {
    return (
      <div className="pd-pagina">
        <div className="pd-contenedor" style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p className="pd-vacio">Cargando información...</p>
        </div>
      </div>
    );
  }

  // Si ocurrió un error al conectar con la API
  if (errorCarga) {
    return (
      <div className="pd-pagina">
        <div className="pd-contenedor" style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p className="pd-error" role="alert">No se pudo conectar con el servidor para obtener el perfil.</p>
        </div>
      </div>
    );
  }

  // Datos estrictamente reales de la base de datos / sesión
  const nombreUsuario = perfilReal?.display_name || user?.name || 'Sin nombre registrado';
  const ubicacionUsuario = perfilReal?.location || 'Ubicación no indicada';
  const descripcionUsuario = perfilReal?.description || 'Sin descripción registrada.';

  // Se prioriza el correo que viene del perfil (el que se guarda al editar).
  // Solo si el perfil no lo trae se usa el de la sesión, que puede estar desactualizado.
  const correoReal = (perfilReal?.email || user?.email || '').trim();
  const correoUsuario = correoReal || 'Sin correo de contacto';

  const tipoCuentaBD = perfilReal?.account_type || user?.account_type || '';
  const tipoCuentaEtiqueta = ETIQUETAS_TIPO_CUENTA[tipoCuentaBD] || tipoCuentaBD || 'No especificado';

  const institucionUsuario = perfilReal?.institution?.trim() || '';
  const areasInteres = separarAreas(perfilReal?.field_of_study);

  return (
    <div className="pd-pagina">
      <div className="pd-contenedor">
        <header className="pd-encabezado pd-encabezado-con-accion">
          <div>
            <span className="pd-eyebrow">MI ESPACIO</span>
            <h1>Mi perfil</h1>
            <p>Un espacio para gestionar tu información y colaboraciones.</p>
          </div>
          {canEdit ? (
            <Link className="pd-boton-oscuro" to={rutaEditar}>Editar perfil →</Link>
          ) : (
            <span className="pd-boton-deshabilitado" role="status">
              {canEditOrganization ? 'Administrador activo: edición de organización disponible' : 'Sin permisos para editar esta organización'}
            </span>
          )}
        </header>

        <section className="pd-tarjeta pd-mi-resumen" aria-label="Datos de mi perfil">
          <div className="pd-mi-identidad">
            <div className="pd-avatar" aria-hidden="true" style={{ textTransform: 'uppercase' }}>
              {obtenerDosIniciales(nombreUsuario)}
            </div>
            <div className="pd-identidad-info">
              <h2>{nombreUsuario}</h2>
              <p>{ubicacionUsuario}</p>
              <div className="pd-identidad-meta">
                <span className="pd-chip">{tipoCuentaEtiqueta}</span>
                <span className="pd-identidad-descripcion">{descripcionUsuario}</span>
              </div>
            </div>
          </div>
          <div className="pd-mi-contacto">
            <span className="pd-mini-label">CONTACTO</span>
            {correoReal ? (
              <p>
                <a href={`mailto:${correoReal}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {correoUsuario}
                </a>
              </p>
            ) : (
              <p>{correoUsuario}</p>
            )}
            <Link to="/perfil-publico">Ver perfil público ↗</Link>
          </div>
        </section>

        <div className="pd-grid-inferior">
          <div className="pd-columna-izquierda">
            <section className="pd-tarjeta pd-info">
              <h2>Acerca del perfil</h2>
              <p>{descripcionUsuario}</p>
              {institucionUsuario && (
                <div className="pd-info-detalle">
                  <span>Institución</span>
                  <strong>{institucionUsuario}</strong>
                </div>
              )}
            </section>

            <section className="pd-tarjeta pd-info">
              <h2>Áreas de interés</h2>
              <div className="pd-intereses">
                {areasInteres.length > 0 ? (
                  areasInteres.map((area) => (
                    <span key={area} style={{ background: '#EDF5F6', color: '#0f172a' }}>
                      {area}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#64748b', fontStyle: 'italic' }}>No indicado</span>
                )}
              </div>
            </section>
          </div>

          <div className="pd-columna-derecha">
            <section className="pd-tarjeta pd-iniciativas">
              <div className="pd-fila-titulo">
                <h2>Mis iniciativas</h2>
                <Link to="/iniciativas">Explorar iniciativas →</Link>
              </div>
              <p className="pd-vacio">Aún no hay iniciativas vinculadas a este perfil.</p>
            </section>

            <section className="pd-tarjeta pd-actividad">
              <div className="pd-fila-titulo">
                <h2>Actividad reciente</h2>
                <span className="pd-enlace-falso">Sesión activa</span>
              </div>
              <div className="pd-actividad-items">
                {actividades.map((actividad, i) => (
                  <p key={actividad}>
                    <span className={i === 0 ? 'pd-punto-azul' : 'pd-punto-naranja'}>●</span>
                    {actividad}
                  </p>
                ))}
              </div>
            </section>
          </div>
        </div>

        <footer className="pd-footer">
          <span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span>
          <span>Privacidad · Ayuda</span>
        </footer>
      </div>
    </div>
  );
}