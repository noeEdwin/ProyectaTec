import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import {
  MODO_SIMULADO,
  cambiarEstadoUsuario,
  cambiarVisibilidadPublicacion,
  extraerMensajeErrorModeracion,
  listarPublicacionesModeracion,
  listarReportesModeracion,
  listarUsuariosModeracion,
  obtenerDetallePublicacionModeracion,
  obtenerDetalleUsuarioModeracion,
  resolverReporte,
} from '../api/moderacionService';
import Toast, { type ToastMessage } from '../components/Toast';
import type {
  EstadoReporte,
  MetaPaginacion,
  PublicacionDetalleModeracion,
  PublicacionModeracion,
  ReporteModeracion,
  TipoPublicacionModeracion,
  UsuarioDetalleModeracion,
  UsuarioModeracion,
} from '../types/moderacion';
import '../styles/perfilEspacio.css';
import '../styles/moderacion.css';

type Pestana = 'reportes' | 'publicaciones' | 'usuarios';

type TipoAccion = 'ocultar' | 'restaurar' | 'desactivar' | 'activar' | 'resolver' | 'descartar' | 'reabrir';

type AccionPendiente = {
  tipo: TipoAccion;
  id: number;
  objetivo: string;
  publicacionTipo?: TipoPublicacionModeracion;
};

const CONFIG_ACCION: Record<TipoAccion, {
  titulo: string;
  texto: (objetivo: string) => string;
  confirmar: string;
  requiereMotivo: boolean;
  peligro: boolean;
}> = {
  ocultar: {
    titulo: 'Ocultar publicación',
    texto: (o) => `"${o}" dejará de mostrarse en el catálogo. Podrás restaurarla después.`,
    confirmar: 'Ocultar publicación',
    requiereMotivo: false,
    peligro: true,
  },
  restaurar: {
    titulo: 'Restaurar publicación',
    texto: (o) => `"${o}" volverá a mostrarse en el catálogo.`,
    confirmar: 'Restaurar publicación',
    requiereMotivo: false,
    peligro: false,
  },
  desactivar: {
    titulo: 'Desactivar usuario',
    texto: (o) => `${o} ya no podrá iniciar sesión y se cerrarán sus sesiones abiertas.`,
    confirmar: 'Desactivar cuenta',
    requiereMotivo: false,
    peligro: true,
  },
  activar: {
    titulo: 'Activar usuario',
    texto: (o) => `${o} podrá volver a iniciar sesión.`,
    confirmar: 'Activar cuenta',
    requiereMotivo: false,
    peligro: false,
  },
  resolver: {
    titulo: 'Marcar reporte como revisado',
    texto: (o) => `Se registrará que el reporte sobre ${o} fue atendido.`,
    confirmar: 'Marcar como revisado',
    requiereMotivo: true,
    peligro: false,
  },
  descartar: {
    titulo: 'Descartar reporte',
    texto: (o) => `Se registrará que el reporte sobre ${o} no procede.`,
    confirmar: 'Descartar reporte',
    requiereMotivo: true,
    peligro: false,
  },
  reabrir: {
    titulo: 'Reabrir reporte',
    texto: (o) => `El reporte sobre ${o} volverá a quedar pendiente y se borrará la nota de decisión.`,
    confirmar: 'Reabrir reporte',
    requiereMotivo: false,
    peligro: false,
  },
};

const ETIQUETA_TIPO_CUENTA: Record<string, string> = {
  estudiante: 'Estudiante',
  student: 'Estudiante',
  academico: 'Personal académico',
  docente: 'Personal académico',
  empleado_organizacion: 'Empleado de organización',
  residente_oaxaca: 'Persona de Oaxaca',
  organizacion: 'Organización',
  organization: 'Organización',
  empresa: 'Empresa',
  institucion_educativa: 'Institución educativa',
  sector_social: 'Sector social',
};

const ETIQUETA_ESTADO_REPORTE: Record<EstadoReporte, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisado',
  discarded: 'Descartado',
};

const ETIQUETA_MOTIVO_REPORTE: Record<string, string> = {
  inappropriate: 'Contenido inapropiado',
  spam: 'Spam',
  misinformation: 'Información engañosa',
  other: 'Otro',
};

const fecha = (valor: string) =>
  new Date(valor).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const normalizar = (texto: string) => texto.toLocaleLowerCase('es-MX');

function objetivoDeReporte(reporte: ReporteModeracion): { tipo: TipoPublicacionModeracion; id: number } {
  return reporte.project_id !== null
    ? { tipo: 'proyecto', id: reporte.project_id }
    : { tipo: 'necesidad', id: reporte.community_need_id ?? 0 };
}

export default function ModeracionAdmin() {
  const { user } = useAuth();
  const [pestana, setPestana] = useState<Pestana>('reportes');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const [usuarios, setUsuarios] = useState<UsuarioModeracion[]>([]);
  const [publicaciones, setPublicaciones] = useState<PublicacionModeracion[]>([]);
  const [reportes, setReportes] = useState<ReporteModeracion[]>([]);
  const [meta, setMeta] = useState<MetaPaginacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [mensaje, setMensaje] = useState<ToastMessage | null>(null);
  const [pendiente, setPendiente] = useState<AccionPendiente | null>(null);
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const [detallePublicacion, setDetallePublicacion] = useState<PublicacionDetalleModeracion | null>(null);
  const [cargandoDetallePub, setCargandoDetallePub] = useState(false);
  const [detalleUsuario, setDetalleUsuario] = useState<UsuarioDetalleModeracion | null>(null);
  const [cargandoDetalleUsuario, setCargandoDetalleUsuario] = useState(false);

  const puedeModerar = Boolean(user?.can_manage_platform);

  const cargar = useCallback(async (pagina = 1) => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [u, p, r] = await Promise.all([
        listarUsuariosModeracion(),
        listarPublicacionesModeracion(),
        listarReportesModeracion(pagina),
      ]);
      setUsuarios(u);
      setPublicaciones(p);
      setReportes(r.reports);
      setMeta(r.meta);
    } catch (err: unknown) {
      setErrorCarga(
        extraerMensajeErrorModeracion(err, 'No fue posible cargar la información de moderación.'),
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!puedeModerar) return;
    const temporizador = window.setTimeout(() => {
      void cargar(1);
    }, 0);
    return () => window.clearTimeout(temporizador);
  }, [cargar, puedeModerar]);

  useEffect(() => {
    if (!pendiente && !detallePublicacion && !detalleUsuario) return undefined;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      if (pendiente) {
        if (!procesando) cerrarDialogo();
      } else if (detalleUsuario) {
        setDetalleUsuario(null);
      } else if (detallePublicacion) {
        setDetallePublicacion(null);
      }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [pendiente, procesando, detallePublicacion, detalleUsuario]);

  async function abrirDetallePublicacion(tipo: TipoPublicacionModeracion, id: number) {
    setCargandoDetallePub(true);
    setDetalleUsuario(null);
    try {
      const detalle = await obtenerDetallePublicacionModeracion(tipo, id);
      setDetallePublicacion(detalle);
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: extraerMensajeErrorModeracion(err, 'No se pudo cargar el detalle completo de la publicación.'),
      });
    } finally {
      setCargandoDetallePub(false);
    }
  }

  async function abrirDetalleUsuario(id: number) {
    setCargandoDetalleUsuario(true);
    setDetallePublicacion(null);
    try {
      const detalle = await obtenerDetalleUsuarioModeracion(id);
      setDetalleUsuario(detalle);
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: extraerMensajeErrorModeracion(err, 'No se pudo cargar el perfil completo del usuario.'),
      });
    } finally {
      setCargandoDetalleUsuario(false);
    }
  }

  function cambiarPestana(nueva: Pestana, busquedaInicial = '') {
    setPestana(nueva);
    setBusqueda(busquedaInicial);
    setFiltro('todos');
  }

  async function irAPagina(pagina: number) {
    setCargando(true);
    setErrorCarga(null);
    try {
      const r = await listarReportesModeracion(pagina);
      setReportes(r.reports);
      setMeta(r.meta);
    } catch (err: unknown) {
      setErrorCarga(
        extraerMensajeErrorModeracion(err, 'No fue posible cargar la página solicitada.'),
      );
    } finally {
      setCargando(false);
    }
  }

  function abrirDialogo(accion: AccionPendiente) {
    setMensaje(null);
    setMotivo('');
    setErrorMotivo('');
    setPendiente(accion);
  }

  function cerrarDialogo() {
    setPendiente(null);
    setMotivo('');
    setErrorMotivo('');
  }

  async function confirmar() {
    if (!pendiente) return;
    const config = CONFIG_ACCION[pendiente.tipo];
    const texto = motivo.trim();
    if (config.requiereMotivo && texto.length < 5) {
      setErrorMotivo('Escribe una nota de al menos 5 caracteres.');
      return;
    }

    setProcesando(true);
    try {
      switch (pendiente.tipo) {
        case 'ocultar':
        case 'restaurar': {
          const actualizada = await cambiarVisibilidadPublicacion(
            pendiente.publicacionTipo ?? 'proyecto',
            pendiente.id,
            pendiente.tipo === 'ocultar',
          );
          setPublicaciones((lista) =>
            lista.map((p) =>
              p.type === actualizada.type && p.id === actualizada.id ? actualizada : p,
            ),
          );
          setDetallePublicacion((cur) =>
            cur && cur.type === actualizada.type && cur.id === actualizada.id
              ? { ...cur, is_hidden: actualizada.is_hidden }
              : cur,
          );
          setMensaje({ tipo: 'exito', texto: `${config.titulo}: acción realizada correctamente.` });
          break;
        }
        case 'desactivar':
        case 'activar': {
          const actualizado = await cambiarEstadoUsuario(
            pendiente.id,
            pendiente.tipo === 'activar',
          );
          setUsuarios((lista) =>
            lista.map((u) => (u.id === actualizado.id ? actualizado : u)),
          );
          setDetalleUsuario((cur) =>
            cur && cur.id === actualizado.id
              ? { ...cur, is_active: actualizado.is_active }
              : cur,
          );
          setMensaje({
            tipo: 'exito',
            texto: actualizado.is_active
              ? `Cuenta activada: ${actualizado.name} (${actualizado.email}) ya puede iniciar sesión.`
              : `Cuenta desactivada: ${actualizado.name} (${actualizado.email}) ya no podrá iniciar sesión.`,
          });
          break;
        }
        case 'resolver':
        case 'descartar':
        case 'reabrir': {
          const estado: EstadoReporte =
            pendiente.tipo === 'resolver'
              ? 'reviewed'
              : pendiente.tipo === 'descartar'
                ? 'discarded'
                : 'pending';
          const actualizado = await resolverReporte(
            pendiente.id,
            estado,
            estado === 'pending' ? undefined : texto,
          );
          setReportes((lista) =>
            lista.map((r) => (r.id === actualizado.id ? actualizado : r)),
          );
          setMensaje({ tipo: 'exito', texto: `${config.titulo}: acción realizada correctamente.` });
          break;
        }
      }
      cerrarDialogo();
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: extraerMensajeErrorModeracion(
          err,
          'No se pudo completar la acción. Vuelve a intentarlo.',
        ),
      });
      cerrarDialogo();
    } finally {
      setProcesando(false);
    }
  }

  const buscarPublicacion = useCallback(
    (tipo: TipoPublicacionModeracion, id: number) =>
      publicaciones.find((p) => p.type === tipo && p.id === id),
    [publicaciones],
  );

  const reportesVisibles = useMemo(
    () =>
      reportes.filter((r) => {
        const objetivo = objetivoDeReporte(r);
        const titulo = buscarPublicacion(objetivo.tipo, objetivo.id)?.title ?? '';
        const coincide = normalizar(
          `${titulo} ${r.reason} ${r.details ?? ''} ${objetivo.id} ${r.reporter_id}`,
        ).includes(normalizar(busqueda.trim()));
        return coincide && (filtro === 'todos' || r.status === filtro);
      }),
    [reportes, busqueda, filtro, buscarPublicacion],
  );

  const publicacionesVisibles = useMemo(
    () =>
      publicaciones.filter((p) => {
        const coincide = normalizar(`${p.title} ${p.author_name} ${p.id}`).includes(
          normalizar(busqueda.trim()),
        );
        const estado = p.is_hidden ? 'ocultas' : 'visibles';
        return coincide && (filtro === 'todos' || estado === filtro);
      }),
    [publicaciones, busqueda, filtro],
  );

  const usuariosVisibles = useMemo(
    () =>
      usuarios.filter((u) => {
        if (user?.id && u.id === user.id) return false;
        const coincide = normalizar(`${u.name} ${u.email} ${u.id}`).includes(
          normalizar(busqueda.trim()),
        );
        const estado = u.is_active ? 'activos' : 'inactivos';
        return coincide && (filtro === 'todos' || estado === filtro);
      }),
    [usuarios, user?.id, busqueda, filtro],
  );

  if (!puedeModerar) {
    return (
      <div className="pd-pagina">
        <main className="pd-contenedor">
          <p className="pd-error" role="alert">
            No tienes permisos para acceder al panel de moderación.
          </p>
          <Link to="/">Volver al inicio</Link>
        </main>
      </div>
    );
  }

  const opcionesFiltro: Record<Pestana, Array<[string, string]>> = {
    reportes: [
      ['todos', 'Todos los estados'],
      ['pending', 'Pendientes'],
      ['reviewed', 'Revisados'],
      ['discarded', 'Descartados'],
    ],
    publicaciones: [
      ['todos', 'Todas'],
      ['visibles', 'Visibles'],
      ['ocultas', 'Ocultas'],
    ],
    usuarios: [
      ['todos', 'Todos'],
      ['activos', 'Activos'],
      ['inactivos', 'Desactivados'],
    ],
  };

  const hayResultados =
    pestana === 'reportes'
      ? reportesVisibles.length
      : pestana === 'publicaciones'
        ? publicacionesVisibles.length
        : usuariosVisibles.length;

  const configPendiente = pendiente ? CONFIG_ACCION[pendiente.tipo] : null;

  return (
    <div className="pd-pagina">
      <main className="pd-contenedor">
        <header className="pd-encabezado">
          <span className="pd-eyebrow">ADMINISTRACIÓN / MODERACIÓN</span>
          <h1>Panel de moderación</h1>
          <p>Revisa reportes, publicaciones y usuarios, y decide qué acciones aplicar.</p>
        </header>

        {MODO_SIMULADO && (
          <p className="mod-aviso-datos" role="status">
            Vista con datos de ejemplo. Los cambios no se guardan en la base de datos.
          </p>
        )}

        <div className="mod-pestanas" role="tablist" aria-label="Secciones de moderación">
          {(
            [
              ['reportes', 'Reportes'],
              ['publicaciones', 'Publicaciones'],
              ['usuarios', 'Usuarios'],
            ] as const
          ).map(([clave, etiqueta]) => (
            <button
              key={clave}
              type="button"
              role="tab"
              id={`mod-tab-${clave}`}
              aria-selected={pestana === clave}
              aria-controls="mod-panel"
              className="mod-pestana"
              onClick={() => cambiarPestana(clave)}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <section id="mod-panel" role="tabpanel" aria-labelledby={`mod-tab-${pestana}`}>
          <div className="mod-filtros">
            <input
              type="search"
              aria-label="Buscar"
              placeholder={
                pestana === 'usuarios'
                  ? 'Buscar por nombre, correo o ID…'
                  : pestana === 'publicaciones'
                    ? 'Buscar por título o autor…'
                    : 'Buscar en esta página de reportes…'
              }
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
            <select
              aria-label="Filtrar por estado"
              value={filtro}
              onChange={(evento) => setFiltro(evento.target.value)}
            >
              {opcionesFiltro[pestana].map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>

          {cargando && (
            <p className="pd-vacio" role="status">
              Cargando información…
            </p>
          )}

          {errorCarga && (
            <div className="pd-tarjeta">
              <p className="pd-error" role="alert">
                {errorCarga}
              </p>
              <div className="pd-acciones">
                <button
                  type="button"
                  className="pd-boton-oscuro"
                  onClick={() => void cargar(meta?.current_page ?? 1)}
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {!cargando && !errorCarga && hayResultados === 0 && (
            <p className="pd-vacio" role="status">
              {pestana === 'usuarios'
                ? usuarios.length === 0
                  ? 'No hay usuarios registrados para moderar.'
                  : 'No se encontraron usuarios con ese nombre, correo o ID.'
                : 'No hay resultados con la búsqueda o el filtro seleccionados.'}
            </p>
          )}

          {!cargando && !errorCarga && pestana === 'reportes' && (
            <>
              <div className="mod-lista">
                {reportesVisibles.map((reporte) => {
                  const objetivo = objetivoDeReporte(reporte);
                  const publicacion = buscarPublicacion(objetivo.tipo, objetivo.id);
                  const nombreTipo =
                    objetivo.tipo === 'proyecto' ? 'Proyecto' : 'Necesidad comunitaria';
                  const titulo = publicacion?.title ?? `${nombreTipo} #${objetivo.id}`;
                  const estaOculta = publicacion ? publicacion.is_hidden : true;
                  const reportante = usuarios.find((u) => u.id === reporte.reporter_id);

                  return (
                    <article className="pd-tarjeta mod-item" key={reporte.id}>
                      <div className="mod-item-cabecera">
                        <div>
                          <h2>{titulo}</h2>
                          <p className="mod-meta">
                            {nombreTipo} #{objetivo.id} · Reportado por{' '}
                            {reportante
                              ? `${reportante.name} (#${reporte.reporter_id})`
                              : `usuario #${reporte.reporter_id}`}{' '}
                            · {fecha(reporte.created_at)}
                          </p>
                        </div>
                        <span
                          className={`mod-etiqueta ${
                            reporte.status === 'pending'
                              ? 'mod-etiqueta-alerta'
                              : reporte.status === 'reviewed'
                                ? 'mod-etiqueta-ok'
                                : 'mod-etiqueta-neutra'
                          }`}
                        >
                          {ETIQUETA_ESTADO_REPORTE[reporte.status]}
                        </span>
                      </div>
                      <p>
                        <strong>Motivo:</strong>{' '}
                        {ETIQUETA_MOTIVO_REPORTE[reporte.reason] ?? reporte.reason}
                      </p>
                      {reporte.details && <p>{reporte.details}</p>}
                      {reporte.decision_notes && (
                        <p className="mod-nota">
                          Nota de decisión: {reporte.decision_notes}
                          {reporte.reviewed_at ? ` · ${fecha(reporte.reviewed_at)}` : ''}
                        </p>
                      )}
                      <div className="mod-acciones">
                        <button
                          type="button"
                          className="pd-boton-claro"
                          disabled={cargandoDetallePub}
                          onClick={() => void abrirDetallePublicacion(objetivo.tipo, objetivo.id)}
                        >
                          Ver publicación
                        </button>
                        {reporte.reporter_id !== user?.id && (
                          <button
                            type="button"
                            className="pd-boton-claro"
                            disabled={cargandoDetalleUsuario}
                            onClick={() => void abrirDetalleUsuario(reporte.reporter_id)}
                          >
                            Ver usuario #{reporte.reporter_id}
                          </button>
                        )}

                        {!estaOculta ? (
                          <button
                            type="button"
                            className="mod-boton-peligro"
                            onClick={() =>
                              abrirDialogo({
                                tipo: 'ocultar',
                                id: objetivo.id,
                                objetivo: titulo,
                                publicacionTipo: objetivo.tipo,
                              })
                            }
                          >
                            Ocultar publicación
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pd-boton-claro"
                            onClick={() =>
                              abrirDialogo({
                                tipo: 'restaurar',
                                id: objetivo.id,
                                objetivo: titulo,
                                publicacionTipo: objetivo.tipo,
                              })
                            }
                          >
                            Restaurar publicación
                          </button>
                        )}

                        {reporte.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="pd-boton-claro"
                              onClick={() =>
                                abrirDialogo({ tipo: 'descartar', id: reporte.id, objetivo: titulo })
                              }
                            >
                              Descartar
                            </button>
                            <button
                              type="button"
                              className="pd-boton-oscuro"
                              onClick={() =>
                                abrirDialogo({ tipo: 'resolver', id: reporte.id, objetivo: titulo })
                              }
                            >
                              Resolver
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="pd-boton-claro"
                            onClick={() =>
                              abrirDialogo({ tipo: 'reabrir', id: reporte.id, objetivo: titulo })
                            }
                          >
                            Reabrir reporte
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {meta && meta.last_page > 1 && (
                <nav className="mod-paginacion" aria-label="Paginación de reportes">
                  <button
                    type="button"
                    className="pd-boton-claro"
                    disabled={meta.current_page <= 1}
                    onClick={() => void irAPagina(meta.current_page - 1)}
                  >
                    ← Anterior
                  </button>
                  <span>
                    Página {meta.current_page} de {meta.last_page} · {meta.total} reportes
                  </span>
                  <button
                    type="button"
                    className="pd-boton-claro"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => void irAPagina(meta.current_page + 1)}
                  >
                    Siguiente →
                  </button>
                </nav>
              )}
            </>
          )}

          {!cargando && !errorCarga && pestana === 'publicaciones' && (
            <div className="mod-lista">
              {publicacionesVisibles.map((publicacion) => (
                <article
                  className="pd-tarjeta mod-item"
                  key={`${publicacion.type}-${publicacion.id}`}
                >
                  <div className="mod-item-cabecera">
                    <div>
                      <h2>{publicacion.title}</h2>
                      <p className="mod-meta">
                        {publicacion.author_name} · {fecha(publicacion.created_at)}
                      </p>
                    </div>
                    <div className="mod-etiquetas">
                      <span className="mod-etiqueta">
                        {publicacion.type === 'proyecto' ? 'Proyecto' : 'Necesidad comunitaria'}
                      </span>
                      <span
                        className={`mod-etiqueta ${
                          publicacion.is_hidden ? 'mod-etiqueta-peligro' : 'mod-etiqueta-ok'
                        }`}
                      >
                        {publicacion.is_hidden ? 'Oculta' : 'Visible'}
                      </span>
                    </div>
                  </div>
                  <div className="mod-acciones">
                    <button
                      type="button"
                      className="pd-boton-claro"
                      disabled={cargandoDetallePub}
                      onClick={() => void abrirDetallePublicacion(publicacion.type, publicacion.id)}
                    >
                      Ver publicación
                    </button>
                    {publicacion.is_hidden ? (
                      <button
                        type="button"
                        className="pd-boton-oscuro"
                        onClick={() =>
                          abrirDialogo({
                            tipo: 'restaurar',
                            id: publicacion.id,
                            objetivo: publicacion.title,
                            publicacionTipo: publicacion.type,
                          })
                        }
                      >
                        Restaurar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="mod-boton-peligro"
                        onClick={() =>
                          abrirDialogo({
                            tipo: 'ocultar',
                            id: publicacion.id,
                            objetivo: publicacion.title,
                            publicacionTipo: publicacion.type,
                          })
                        }
                      >
                        Ocultar
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {!cargando && !errorCarga && pestana === 'usuarios' && (
            <div className="mod-lista">
              {usuariosVisibles.map((usuario) => (
                <article className="pd-tarjeta mod-item" key={usuario.id}>
                  <div className="mod-item-cabecera">
                    <div>
                      <h2>
                        {usuario.name}{' '}
                        <span className="mod-meta" style={{ fontWeight: 500 }}>
                          (ID #{usuario.id})
                        </span>
                      </h2>
                      <p className="mod-meta">
                        {usuario.email} · Registro: {fecha(usuario.created_at)}
                      </p>
                    </div>
                    <div className="mod-etiquetas">
                      <span className="mod-etiqueta">
                        {ETIQUETA_TIPO_CUENTA[usuario.account_type] ?? usuario.account_type}
                      </span>
                      <span
                        className={`mod-etiqueta ${
                          usuario.is_active ? 'mod-etiqueta-ok' : 'mod-etiqueta-peligro'
                        }`}
                      >
                        {usuario.is_active ? 'Activo' : 'Desactivado'}
                      </span>
                    </div>
                  </div>
                  <div className="mod-acciones">
                    <button
                      type="button"
                      className="pd-boton-claro"
                      disabled={cargandoDetalleUsuario}
                      onClick={() => void abrirDetalleUsuario(usuario.id)}
                    >
                      Ver perfil completo
                    </button>
                    {usuario.is_active ? (
                      <button
                        type="button"
                        className="mod-boton-peligro"
                        onClick={() =>
                          abrirDialogo({
                            tipo: 'desactivar',
                            id: usuario.id,
                            objetivo: `${usuario.name} (${usuario.email})`,
                          })
                        }
                      >
                        Desactivar usuario
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="pd-boton-oscuro"
                        onClick={() =>
                          abrirDialogo({
                            tipo: 'activar',
                            id: usuario.id,
                            objetivo: `${usuario.name} (${usuario.email})`,
                          })
                        }
                      >
                        Activar usuario
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="pd-footer">
          <span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span>
          <span>Privacidad · Ayuda</span>
        </footer>
      </main>

      {detallePublicacion && (
        <div
          className="mod-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setDetallePublicacion(null);
          }}
        >
          <div
            className="mod-dialogo-detalle"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mod-pub-detalle-titulo"
          >
            <div className="mod-modal-cabecera">
              <div>
                <div className="mod-etiquetas" style={{ marginBottom: 6 }}>
                  <span className="mod-etiqueta">
                    {detallePublicacion.type === 'proyecto' ? 'Proyecto' : 'Necesidad comunitaria'} #{detallePublicacion.id}
                  </span>
                  <span className={`mod-etiqueta ${detallePublicacion.is_hidden ? 'mod-etiqueta-peligro' : 'mod-etiqueta-ok'}`}>
                    {detallePublicacion.is_hidden ? 'Oculta en catálogo' : 'Visible'}
                  </span>
                  <span className="mod-etiqueta mod-etiqueta-neutra">
                    Estado: {detallePublicacion.status}
                  </span>
                </div>
                <h2 id="mod-pub-detalle-titulo">{detallePublicacion.title}</h2>
              </div>
              <button
                type="button"
                className="mod-modal-cerrar"
                onClick={() => setDetallePublicacion(null)}
                aria-label="Cerrar detalle de publicación"
              >
                ×
              </button>
            </div>

            <div className="mod-detalle-grid">
              <div className="mod-detalle-item">
                <span>Categoría / Sector</span>
                <strong>
                  {detallePublicacion.category?.name ?? 'Sin categoría'}
                  {detallePublicacion.category?.sector ? ` · ${detallePublicacion.category.sector}` : ''}
                </strong>
              </div>
              <div className="mod-detalle-item">
                <span>Ubicación</span>
                <strong>{detallePublicacion.location || 'No indicada'}</strong>
              </div>
              {detallePublicacion.modality && (
                <div className="mod-detalle-item">
                  <span>Modalidad</span>
                  <strong>{detallePublicacion.modality}</strong>
                </div>
              )}
              {detallePublicacion.organization && (
                <div className="mod-detalle-item">
                  <span>Organización vinculada</span>
                  <strong>{detallePublicacion.organization.name}</strong>
                </div>
              )}
              {detallePublicacion.created_at && (
                <div className="mod-detalle-item">
                  <span>Fecha de publicación</span>
                  <strong>{fecha(detallePublicacion.created_at)}</strong>
                </div>
              )}
            </div>

            <div className="mod-detalle-seccion">
              <h3>Descripción</h3>
              {detallePublicacion.cover_image_url && (
                <img
                  src={detallePublicacion.cover_image_url}
                  alt={`Portada de ${detallePublicacion.title}`}
                  className="dp-portada"
                  style={{ maxHeight: 220, marginBottom: 12 }}
                />
              )}
              <p className="mod-detalle-texto">
                {detallePublicacion.description || 'Sin descripción.'}
              </p>
              {detallePublicacion.gallery_urls && detallePublicacion.gallery_urls.length > 0 && (
                <div className="dp-galeria" style={{ marginTop: 12 }}>
                  {detallePublicacion.gallery_urls.map((url, idx) => (
                    <a key={`${url}-${idx}`} href={url} target="_blank" rel="noopener noreferrer" className="dp-galeria-btn">
                      <img src={url} alt={`Galería ${idx + 1}`} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {detallePublicacion.author && (
              <div className="mod-detalle-seccion">
                <h3>Autor</h3>
                <div className="mod-subitem">
                  <div>
                    <strong>{detallePublicacion.author.name} (#{detallePublicacion.author.id})</strong>
                    <div className="pd-enlace-falso">
                      {detallePublicacion.author.email} · {ETIQUETA_TIPO_CUENTA[detallePublicacion.author.account_type] ?? detallePublicacion.author.account_type}
                      {detallePublicacion.author.institution ? ` · ${detallePublicacion.author.institution}` : ''}
                      {detallePublicacion.author.organization_name ? ` · ${detallePublicacion.author.organization_name}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pd-boton-claro"
                    onClick={() => void abrirDetalleUsuario(detallePublicacion.author!.id)}
                  >
                    Ver perfil del autor
                  </button>
                </div>
              </div>
            )}

            {detallePublicacion.needs.length > 0 && (
              <div className="mod-detalle-seccion">
                <h3>Vacantes / requerimientos ({detallePublicacion.needs.length})</h3>
                <div className="mod-sublista">
                  {detallePublicacion.needs.map((need) => (
                    <div className="mod-subitem" key={need.id}>
                      <div>
                        <strong>{need.title}</strong>
                        <div className="pd-enlace-falso">
                          {need.required_profile || need.description || 'Sin detalle'} · {need.openings} plazas
                        </div>
                      </div>
                      <span className="mod-etiqueta">{need.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mod-detalle-seccion">
              <h3>Reportes recibidos ({detallePublicacion.reports.length})</h3>
              {detallePublicacion.reports.length === 0 ? (
                <p className="pd-ayuda">Esta publicación no tiene reportes registrados.</p>
              ) : (
                <div className="mod-sublista">
                  {detallePublicacion.reports.map((rep) => (
                    <div className="mod-subitem" key={rep.id}>
                      <div>
                        <strong>{ETIQUETA_MOTIVO_REPORTE[rep.reason] ?? rep.reason}</strong>
                        {rep.details && <div className="pd-enlace-falso">{rep.details}</div>}
                        {rep.reporter && (
                          <div className="pd-enlace-falso">
                            Reportado por: {rep.reporter.name} (#{rep.reporter.id})
                          </div>
                        )}
                      </div>
                      <span className="mod-etiqueta">{ETIQUETA_ESTADO_REPORTE[rep.status]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pd-acciones" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="pd-boton-claro"
                onClick={() => setDetallePublicacion(null)}
              >
                Cerrar
              </button>
              {detallePublicacion.is_hidden ? (
                <button
                  type="button"
                  className="pd-boton-oscuro"
                  onClick={() =>
                    abrirDialogo({
                      tipo: 'restaurar',
                      id: detallePublicacion.id,
                      objetivo: detallePublicacion.title,
                      publicacionTipo: detallePublicacion.type,
                    })
                  }
                >
                  Restaurar publicación
                </button>
              ) : (
                <button
                  type="button"
                  className="mod-boton-peligro"
                  onClick={() =>
                    abrirDialogo({
                      tipo: 'ocultar',
                      id: detallePublicacion.id,
                      objetivo: detallePublicacion.title,
                      publicacionTipo: detallePublicacion.type,
                    })
                  }
                >
                  Ocultar publicación
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {detalleUsuario && (
        <div
          className="mod-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setDetalleUsuario(null);
          }}
        >
          <div
            className="mod-dialogo-detalle"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mod-user-detalle-titulo"
          >
            <div className="mod-modal-cabecera">
              <div>
                <div className="mod-etiquetas" style={{ marginBottom: 6 }}>
                  <span className="mod-etiqueta">
                    {ETIQUETA_TIPO_CUENTA[detalleUsuario.account_type] ?? detalleUsuario.account_type}
                  </span>
                  <span className={`mod-etiqueta ${detalleUsuario.is_active ? 'mod-etiqueta-ok' : 'mod-etiqueta-peligro'}`}>
                    {detalleUsuario.is_active ? 'Cuenta activa' : 'Desactivada'}
                  </span>
                  {detalleUsuario.profile?.affiliation_status && (
                    <span className="mod-etiqueta mod-etiqueta-neutra">
                      Afiliación: {detalleUsuario.profile.affiliation_status}
                    </span>
                  )}
                </div>
                <h2 id="mod-user-detalle-titulo">{detalleUsuario.name} (ID #{detalleUsuario.id})</h2>
                <p className="mod-meta">{detalleUsuario.email} · Registro: {fecha(detalleUsuario.created_at)}</p>
              </div>
              <button
                type="button"
                className="mod-modal-cerrar"
                onClick={() => setDetalleUsuario(null)}
                aria-label="Cerrar perfil de usuario"
              >
                ×
              </button>
            </div>

            <div className="mod-stats-grid">
              <div className="mod-stat">
                <strong>{detalleUsuario.stats.projects_count}</strong>
                <span>Proyectos</span>
              </div>
              <div className="mod-stat">
                <strong>{detalleUsuario.stats.community_needs_count}</strong>
                <span>Necesidades</span>
              </div>
              <div className="mod-stat">
                <strong>{detalleUsuario.stats.reports_made_count}</strong>
                <span>Reportes hechos</span>
              </div>
              <div className="mod-stat">
                <strong>{detalleUsuario.stats.reports_received_count}</strong>
                <span>Reportes recibidos</span>
              </div>
            </div>

            {detalleUsuario.profile ? (
              <>
                <div className="mod-detalle-grid">
                  {detalleUsuario.profile.institution && (
                    <div className="mod-detalle-item">
                      <span>Institución</span>
                      <strong>{detalleUsuario.profile.institution}</strong>
                    </div>
                  )}
                  {detalleUsuario.profile.campus && (
                    <div className="mod-detalle-item">
                      <span>Campus / plantel</span>
                      <strong>{detalleUsuario.profile.campus}</strong>
                    </div>
                  )}
                  {detalleUsuario.profile.field_of_study && (
                    <div className="mod-detalle-item">
                      <span>Carrera / área</span>
                      <strong>{detalleUsuario.profile.field_of_study}</strong>
                    </div>
                  )}
                  {detalleUsuario.profile.semester && (
                    <div className="mod-detalle-item">
                      <span>Semestre</span>
                      <strong>{detalleUsuario.profile.semester}</strong>
                    </div>
                  )}
                  {detalleUsuario.profile.student_number && (
                    <div className="mod-detalle-item">
                      <span>No. de control / matrícula</span>
                      <strong>{detalleUsuario.profile.student_number}</strong>
                    </div>
                  )}
                  {detalleUsuario.profile.academic_role && (
                    <div className="mod-detalle-item">
                      <span>Actividad académica</span>
                      <strong>{detalleUsuario.profile.academic_role}</strong>
                    </div>
                  )}
                  {detalleUsuario.profile.organization_name && (
                    <div className="mod-detalle-item">
                      <span>Organización</span>
                      <strong>{detalleUsuario.profile.organization_name}</strong>
                    </div>
                  )}
                  {detalleUsuario.profile.organization_position && (
                    <div className="mod-detalle-item">
                      <span>Cargo / puesto</span>
                      <strong>{detalleUsuario.profile.organization_position}</strong>
                    </div>
                  )}
                  {(detalleUsuario.profile.municipality || detalleUsuario.profile.location) && (
                    <div className="mod-detalle-item">
                      <span>Ubicación / municipio</span>
                      <strong>{detalleUsuario.profile.location || detalleUsuario.profile.municipality}</strong>
                    </div>
                  )}
                  {detalleUsuario.profile.phone && (
                    <div className="mod-detalle-item">
                      <span>Teléfono</span>
                      <strong>{detalleUsuario.profile.phone}</strong>
                    </div>
                  )}
                </div>

                {detalleUsuario.profile.description && (
                  <div className="mod-detalle-seccion">
                    <h3>Biografía / descripción</h3>
                    <p className="mod-detalle-texto">{detalleUsuario.profile.description}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="pd-ayuda">El usuario aún no ha completado su perfil extendido.</p>
            )}

            {detalleUsuario.organizations.length > 0 && (
              <div className="mod-detalle-seccion">
                <h3>Organizaciones vinculadas ({detalleUsuario.organizations.length})</h3>
                <div className="mod-sublista">
                  {detalleUsuario.organizations.map((org) => (
                    <div className="mod-subitem" key={`${org.id}-${org.role}`}>
                      <strong>{org.name}</strong>
                      <span className="mod-etiqueta">
                        {org.role === 'admin' ? 'Administrador' : 'Miembro'} · {org.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(detalleUsuario.projects.length > 0 || detalleUsuario.community_needs.length > 0) && (
              <div className="mod-detalle-seccion">
                <h3>Publicaciones recientes</h3>
                <div className="mod-sublista">
                  {[...detalleUsuario.projects, ...detalleUsuario.community_needs].map((pub) => (
                    <div className="mod-subitem" key={`${pub.type}-${pub.id}`}>
                      <div>
                        <strong>{pub.title}</strong>
                        <div className="pd-enlace-falso">
                          {pub.type === 'proyecto' ? 'Proyecto' : 'Necesidad comunitaria'} · {pub.is_hidden ? 'Oculta' : 'Visible'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="pd-boton-claro"
                        onClick={() => void abrirDetallePublicacion(pub.type, pub.id)}
                      >
                        Ver publicación
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pd-acciones" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="pd-boton-claro"
                onClick={() => setDetalleUsuario(null)}
              >
                Cerrar
              </button>
              {detalleUsuario.id !== user?.id && (
                detalleUsuario.is_active ? (
                  <button
                    type="button"
                    className="mod-boton-peligro"
                    onClick={() =>
                      abrirDialogo({
                        tipo: 'desactivar',
                        id: detalleUsuario.id,
                        objetivo: `${detalleUsuario.name} (${detalleUsuario.email})`,
                      })
                    }
                  >
                    Desactivar usuario
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pd-boton-oscuro"
                    onClick={() =>
                      abrirDialogo({
                        tipo: 'activar',
                        id: detalleUsuario.id,
                        objetivo: `${detalleUsuario.name} (${detalleUsuario.email})`,
                      })
                    }
                  >
                    Activar usuario
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {pendiente && configPendiente && (
        <div
          className="mod-overlay mod-overlay-alto"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget && !procesando) cerrarDialogo();
          }}
        >
          <div
            className="mod-dialogo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mod-dialogo-titulo"
          >
            <h2 id="mod-dialogo-titulo">{configPendiente.titulo}</h2>
            <p>{configPendiente.texto(pendiente.objetivo)}</p>
            {configPendiente.requiereMotivo && (
              <div className="pd-campo">
                <label htmlFor="mod-motivo">Nota de decisión (obligatoria)</label>
                <textarea
                  id="mod-motivo"
                  rows={3}
                  maxLength={1000}
                  value={motivo}
                  onChange={(evento) => {
                    setMotivo(evento.target.value);
                    setErrorMotivo('');
                  }}
                  aria-invalid={Boolean(errorMotivo)}
                  aria-describedby={errorMotivo ? 'mod-motivo-error' : undefined}
                />
                {errorMotivo && (
                  <p className="pd-error" id="mod-motivo-error">
                    {errorMotivo}
                  </p>
                )}
              </div>
            )}
            <div className="pd-acciones">
              <button
                type="button"
                className="pd-boton-claro"
                autoFocus
                disabled={procesando}
                onClick={cerrarDialogo}
              >
                Cancelar
              </button>
              {configPendiente.peligro ? (
                <button
                  type="button"
                  className="mod-boton-peligro"
                  disabled={procesando}
                  onClick={() => void confirmar()}
                >
                  {procesando ? 'Guardando…' : configPendiente.confirmar}
                </button>
              ) : (
                <button
                  type="button"
                  className="pd-boton-oscuro"
                  disabled={procesando}
                  onClick={() => void confirmar()}
                >
                  {procesando ? 'Guardando…' : configPendiente.confirmar}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast toast={mensaje} onClose={() => setMensaje(null)} />
    </div>
  );
}