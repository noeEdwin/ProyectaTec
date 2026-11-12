import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getMyOrganizations, getMyProfile } from '../api/profileService';
import type { OrganizationAccess, UserProfile } from '../api/profileService';
import { obtenerTipoPerfil } from '../context/perfil-context';
import type { TipoPerfil } from '../context/perfil-context';
import { useAuth } from '../context/auth-context';
import type { PerfilPublicoData } from '../types/perfil';
import { inicialesPerfil } from '../utils/perfil';
import '../styles/perfilEspacio.css';

const ROLES_ACADEMICOS: Record<string, string> = {
  docente: 'Docente',
  investigador: 'Investigador/a',
  ambos: 'Docente e investigador/a',
};

/** Etiqueta y valor de la sección "Acerca del perfil" según el tipo de cuenta. */
function resumenPersona(data: UserProfile): { etiqueta: string; valor: string } {
  const unir = (...partes: Array<string | null | undefined>) => partes.filter(Boolean).join(' · ');
  switch (data.account_type) {
    case 'academico':
      return { etiqueta: 'Institución y actividad', valor: unir(data.institution, ROLES_ACADEMICOS[data.academic_role ?? ''] ?? data.academic_role) };
    case 'empleado_organizacion':
      return { etiqueta: 'Organización y cargo', valor: unir(data.organization_name, data.organization_position) };
    case 'residente_oaxaca':
      return { etiqueta: 'Municipio y comunidad', valor: unir(data.municipality, data.locality) };
    default:
      return { etiqueta: 'Institución y carrera', valor: unir(data.institution, data.field_of_study) };
  }
}

export default function MiPerfil() {
  const [busqueda] = useSearchParams();
  const tipo = obtenerTipoPerfil(busqueda.get('tipo'));
  const { user } = useAuth();
  const [perfilCargado, setPerfilCargado] = useState<{
    tipo: TipoPerfil;
    perfil: PerfilPublicoData;
    etiqueta: string;
  } | null>(null);
  const [personLoading, setPersonLoading] = useState(true);
  const [personError, setPersonError] = useState('');
  const [organizations, setOrganizations] = useState<OrganizationAccess[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationError, setOrganizationError] = useState('');
  const selectedOrganizationId = Number(busqueda.get('id'));
  const organization = organizations.find((item) => item.id === selectedOrganizationId) ?? organizations[0];
  const perfil: PerfilPublicoData = tipo === 'organizacion' && organization
    ? {
        id: String(organization.id),
        is_organization: true,
        name: organization.name,
        description: organization.description ?? '',
        location: organization.location ?? '',
        image: organization.image_url ?? null,
        classification: organization.classification ?? '',
        contact: {},
        initiatives: [],
      }
    : perfilCargado?.tipo === tipo ? perfilCargado.perfil : {
        id: 'personal', is_organization: false, name: user?.name ?? '',
        description: '', location: '', image: null, classification: '',
        contact: { email: user?.email }, initiatives: [],
      };

  useEffect(() => {
    if (tipo !== 'persona') return;

    let activo = true;
    void getMyProfile()
      .then((data) => {
        if (!activo) return;

        const resumen = resumenPersona(data);
        setPerfilCargado({
          tipo,
          etiqueta: resumen.etiqueta,
          perfil: {
            id: String(data.id ?? 'personal'),
            is_organization: false,
            image: null,
            initiatives: [],
            interests: data.interest_areas || [],
            name: data.display_name || user?.name || '',
            description: data.description || '',
            location: data.location || '',
            classification: resumen.valor,
            contact: {
              email: data.email || user?.email || '',
              phone: data.phone,
            },
          },
        });
      })
      .catch(() => {
        if (activo) setPersonError('No se pudo cargar tu perfil. Intenta recargar la página.');
      })
      .finally(() => { if (activo) setPersonLoading(false); });

    return () => {
      activo = false;
    };
  }, [tipo, user?.email, user?.name]);

  useEffect(() => {
    if (tipo !== 'organizacion') return;

    let activo = true;
    void getMyOrganizations()
      .then((organizations) => {
        if (!activo) return;
        setOrganizations(organizations);
        setOrganizationError('');
      })
      .catch(() => {
        if (activo) setOrganizationError('No se pudieron cargar tus organizaciones. Intenta recargar la página.');
      })
      .finally(() => {
        if (activo) setOrganizationsLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [tipo]);

  const etiquetaResumen = perfilCargado?.tipo === tipo ? perfilCargado.etiqueta : 'Información adicional';
  const canEdit = tipo === 'persona' || Boolean(organization?.can_update);
  const editOrganizationLink = organization
    ? `/editar-perfil-organizacion?id=${organization.id}`
    : '#';

  if (tipo === 'organizacion' && organizationError) {
    return <div className="pd-pagina"><main className="pd-contenedor"><p className="pd-error" role="alert">{organizationError}</p></main></div>;
  }

  if (tipo === 'persona' && personError) {
    return <div className="pd-pagina"><main className="pd-contenedor"><p className="pd-error" role="alert">{personError}</p></main></div>;
  }

  if (tipo === 'persona' && personLoading) {
    return <div className="pd-pagina"><main className="pd-contenedor"><p className="pd-vacio" aria-live="polite">Cargando tu perfil…</p></main></div>;
  }

  if (tipo === 'organizacion' && organizationsLoading) {
    return <div className="pd-pagina"><main className="pd-contenedor"><p className="pd-vacio" aria-live="polite">Cargando tus organizaciones…</p></main></div>;
  }

  if (tipo === 'organizacion' && !organization && organizations.length === 0) {
    return (
      <div className="pd-pagina">
        <main className="pd-contenedor">
          <header className="pd-encabezado"><span className="pd-eyebrow">MI ESPACIO</span><h1>Mi perfil</h1></header>
          <section className="pd-tarjeta" aria-live="polite">
            <h2>No tienes organizaciones vinculadas</h2>
            <p className="pd-vacio">Cuando formes parte de una organización activa, podrás consultar aquí su perfil.</p>
            <Link className="pd-boton-oscuro" to="/mi-perfil?tipo=persona">Ver perfil personal</Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="pd-pagina">
      <div className="pd-contenedor">
        <header className="pd-encabezado pd-encabezado-con-accion">
          <div>
            <span className="pd-eyebrow">MI ESPACIO</span>
            <h1>Mi perfil</h1>
            <p>Gestiona tu información de acceso y colaboraciones en el sistema.</p>
            {tipo === 'organizacion' && organizations.length > 1 && (
              <nav className="pd-demo-selector" aria-label="Seleccionar organización">
                {organizations.map((item) => (
                  <Link
                    key={item.id}
                    to={`/mi-perfil?tipo=organizacion&id=${item.id}`}
                    aria-current={item.id === organization?.id ? 'page' : undefined}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          {canEdit ? (
            <Link className="pd-boton-oscuro" to={tipo === 'organizacion' ? editOrganizationLink : '/perfil'}>Editar perfil →</Link>
          ) : (
            <span className="pd-boton-deshabilitado" role="status">
              Sin permisos para editar esta organización
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
                {tipo === 'organizacion' && organization?.approval_status === 'pending' && (
                  <span className="pd-boton-deshabilitado" role="status">Registro pendiente de aprobación por ProyectaTec</span>
                )}
                {tipo === 'organizacion' && organization?.approval_status === 'rejected' && (
                  <span className="pd-boton-deshabilitado" role="status">Registro rechazado: {organization.rejection_reason || 'consulta a ProyectaTec el motivo'}. Corrige los datos y vuelve a enviarlo desde Editar perfil.</span>
                )}
              </div>
            </div>
          </div>
          <div className="pd-mi-contacto">
            <span className="pd-mini-label">CONTACTO</span>
            <p>{perfil.contact.email || 'Sin correo de contacto'}</p>
            {(tipo !== 'organizacion' || organization?.approval_status === 'approved') && (
              <Link to={tipo === 'organizacion' && organization ? `/organizaciones/${organization.id}` : '/perfil-publico'}>Ver perfil público ↗</Link>
            )}
          </div>
        </section>

        <div className="pd-grid-inferior">
          <div className="pd-columna-izquierda">
            <section className="pd-tarjeta pd-info">
              <h2>Acerca del perfil</h2>
              <p>Información sincronizada directamente desde tu sesión activa.</p>
              <div className="pd-info-detalle">
                <span>{perfil.is_organization ? 'Sector o actividad' : etiquetaResumen}</span>
                <strong>{perfil.classification || 'No indicado'}</strong>
              </div>
            </section>
            {tipo === 'persona' && Boolean(perfil.interests?.length) && (
              <section className="pd-tarjeta pd-info">
                <h2>Áreas de interés</h2>
                <div className="pd-intereses">{perfil.interests?.map((area) => <span key={area}>{area}</span>)}</div>
              </section>
            )}
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
              <p className="pd-vacio">Aún no hay actividad registrada en este perfil.</p>
            </section>
          </div>
        </div>

        <footer className="pd-footer"><span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span><span>Privacidad · Ayuda</span></footer>
      </div>
    </div>
  );
}