import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getMyOrganizations, getMyProfile } from '../api/profileService';
import { obtenerTipoPerfil, usePerfil } from '../context/perfil-context';
import type { TipoPerfil } from '../context/perfil-context';
import { inicialesPerfil } from '../utils/perfil';
import '../styles/perfilEspacio.css';

export default function MiPerfil() {
  const [busqueda] = useSearchParams();
  const tipo = obtenerTipoPerfil(busqueda.get('tipo'));
  const { perfiles } = usePerfil();
  const [perfilCargado, setPerfilCargado] = useState<{
    tipo: TipoPerfil;
    perfil: typeof perfiles.persona;
  } | null>(null);
  const [canEditOrganization, setCanEditOrganization] = useState(false);
  const perfil = perfilCargado?.tipo === tipo ? perfilCargado.perfil : perfiles[tipo];
  const actividades = tipo === 'organizacion'
    ? ['Actualización de una iniciativa', 'Nueva solicitud de colaboración']
    : ['Participación en una iniciativa', 'Nueva actividad de colaboración'];

  useEffect(() => {
    if (tipo !== 'persona') return;

    let activo = true;
    void getMyProfile()
      .then((data) => {
        if (!activo) return;

        setPerfilCargado({
          tipo,
          perfil: {
            ...perfiles.persona,
            name: data.display_name || perfiles.persona.name,
            description: data.description || '',
            location: data.location || '',
            classification: [data.institution, data.field_of_study]
              .filter(Boolean)
              .join(' ') || perfiles.persona.classification,
            contact: {
              ...perfiles.persona.contact,
              email: data.email || perfiles.persona.contact.email,
              phone: data.phone,
            },
          },
        });
      })
      .catch(() => {
        // Conserva datos de ejemplo si la API no está disponible.
      });

    return () => {
      activo = false;
    };
  }, [perfiles.persona, tipo]);

  useEffect(() => {
    if (tipo !== 'organizacion') return;

    let activo = true;
    void getMyOrganizations()
      .then((organizations) => {
        if (activo) setCanEditOrganization(organizations.some((organization) => organization.can_update));
      })
      .catch(() => {
        if (activo) setCanEditOrganization(false);
      });

    return () => {
      activo = false;
    };
  }, [tipo]);

  const canEdit = !perfil.is_organization;

  return (
    <div className="pd-pagina">
      <div className="pd-contenedor">
        <header className="pd-encabezado pd-encabezado-con-accion">
          <div>
            <span className="pd-eyebrow">MI ESPACIO</span>
            <h1>Mi perfil</h1>
            <p>Gestiona tu información de acceso y colaboraciones en el sistema.</p>
          </div>
          {canEdit ? (
            <Link className="pd-boton-oscuro" to="/perfil">Editar perfil →</Link>
          ) : (
            <span className="pd-boton-deshabilitado" role="status">
              {canEditOrganization ? 'Administrador activo: edición de organización disponible' : 'Sin permisos para editar esta organización'}
            </span>
          )}
        </header>

        <section className="pd-tarjeta pd-mi-resumen" aria-label="Datos de mi perfil">
          <div className="pd-mi-identidad">
            <div className="pd-avatar" aria-hidden="true">
              {perfil.image ? <img src={perfil.image} alt="" /> : inicialesPerfil(perfil.name)}
            </div>
            <div className="pd-identidad-info">
              <h2>{perfil.name || 'Sin nombre registrado'}</h2>
              <p>{perfil.location || 'Ubicación no indicada'}</p>
              <div className="pd-identidad-meta">
                <span className="pd-chip">{perfil.is_organization ? 'Organización' : 'Persona'}</span>
                <span className="pd-identidad-descripcion">{perfil.description || 'Sin descripción registrada.'}</span>
              </div>
            </div>
          </div>
          <div className="pd-mi-contacto">
            <span className="pd-mini-label">CONTACTO</span>
            <p>{perfil.contact.email || 'Sin correo de contacto'}</p>
            <Link to="/perfil-publico">Ver perfil público ↗</Link>
          </div>
        </section>

        <div className="pd-grid-inferior">
          <div className="pd-columna-izquierda">
            <section className="pd-tarjeta pd-info">
              <h2>Acerca del perfil</h2>
              <p>Información sincronizada directamente desde tu sesión activa.</p>
              <div className="pd-info-detalle">
                <span>{perfil.is_organization ? 'Sector o actividad' : 'Área de interés'}</span>
                <strong>{perfil.classification || 'No indicado'}</strong>
              </div>
            </section>
          </div>
          <div className="pd-columna-derecha">
            <section className="pd-tarjeta pd-iniciativas">
              <div className="pd-fila-titulo"><h2>Mis iniciativas</h2><Link to="/iniciativas">Explorar iniciativas →</Link></div>
              {perfil.initiatives.length === 0 ? <p className="pd-vacio">Aún no hay iniciativas vinculadas a este perfil.</p> : (
                <ul>{perfil.initiatives.map((item) => <li key={item.id}>
                  <div><h3>{item.titulo}</h3><p>{item.categoria} · {item.sector}</p></div>
                  <span>{item.estado === 'En curso' ? '● ' : '• '}{item.estado}</span>
                </li>)}</ul>
              )}
            </section>
            <section className="pd-tarjeta pd-actividad">
              <div className="pd-fila-titulo"><h2>Actividad reciente</h2><span className="pd-enlace-falso">Sesión activa</span></div>
              <div className="pd-actividad-items">{actividades.map((actividad, i) => <p key={actividad}><span className={i === 0 ? 'pd-punto-azul' : 'pd-punto-naranja'}>●</span>{actividad}</p>)}</div>
            </section>
          </div>
        </div>

        <footer className="pd-footer"><span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span><span>Privacidad · Ayuda</span></footer>
      </div>
    </div>
  );
}
