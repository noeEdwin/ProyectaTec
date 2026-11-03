import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import '../styles/perfilEspacio.css';

export default function MiPerfil() {
  const { user } = useAuth();
  
  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Datos reales del usuario o valores por defecto si está cargando
  const nombreReal = user?.name || 'Usuario ProyectaTec';
  const correoReal = user?.email || 'correo@itoaxaca.edu.mx';
  // Mapeamos el account_type del backend a un texto legible para la UI
  const tipoCuentaReal = user?.account_type === 'organizacion' ? 'Organización' : 'Persona / Estudiante';

  const actividades = [
    'Inicio de sesión registrado correctamente',
    'Sincronización con el ecosistema ProyectaTec'
  ];

  return (
    <div className="pd-pagina">
      <div className="pd-contenedor">
        <header className="pd-encabezado pd-encabezado-con-accion">
          <div>
            <span className="pd-eyebrow">MI ESPACIO</span>
            <h1>Mi perfil</h1>
            <p>Gestiona tu información de acceso y colaboraciones en el sistema.</p>
          </div>
          <Link className="pd-boton-oscuro" to="/editar-perfil">Editar perfil →</Link>
        </header>

        <section className="pd-tarjeta pd-mi-resumen" aria-label="Datos de mi perfil">
          <div className="pd-mi-identidad">
            <div className="pd-avatar" aria-hidden="true">
              {getInitials(nombreReal)}
            </div>
            <div className="pd-identidad-info">
              <h2>{nombreReal}</h2>
              <p>Oaxaca, México</p>
              <div className="pd-identidad-meta">
                <span className="pd-chip">{tipoCuentaReal}</span>
                <span className="pd-identidad-descripcion">
                  Cuenta verificada mediante autenticación segura de Laravel Sanctum.
                </span>
              </div>
            </div>
          </div>
          <div className="pd-mi-contacto">
            <span className="pd-mini-label">CORREO DE ACCESO</span>
            <p>{correoReal}</p>
            <Link to="/perfil-publico">Ver perfil público ↗</Link>
          </div>
        </section>

        <div className="pd-grid-inferior">
          <div className="pd-columna-izquierda">
            <section className="pd-tarjeta pd-info">
              <h2>Acerca del perfil</h2>
              <p>Información sincronizada directamente desde tu sesión activa en el servidor.</p>
              <div className="pd-info-detalle">
                <span>Tipo en Base de Datos</span>
                <strong>{user?.account_type || 'No especificado'}</strong>
              </div>
            </section>
          </div>
          <div className="pd-columna-derecha">
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