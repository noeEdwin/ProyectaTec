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
  resolverReporte,
} from '../api/moderacionService';
import type {
  EstadoReporte,
  MetaPaginacion,
  PublicacionModeracion,
  ReporteModeracion,
  TipoPublicacionModeracion,
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
  academico: 'Personal académico',
  empleado_organizacion: 'Empleado de organización',
  residente_oaxaca: 'Persona de Oaxaca',
  organizacion: 'Organización',
};

const ETIQUETA_ESTADO_REPORTE: Record<EstadoReporte, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisado',
  discarded: 'Descartado',
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

  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [pendiente, setPendiente] = useState<AccionPendiente | null>(null);
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

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
    if (!pendiente) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !procesando) cerrarDialogo();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [pendiente, procesando]);

  function cambiarPestana(nueva: Pestana, busquedaInicial = '') {
    setPestana(nueva);
    setMensaje(null);
    setBusqueda(busquedaInicial);
    setFiltro('todos');
  }

  async function irAPagina(pagina: number) {
    setMensaje(null);
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
          setMensaje({
            tipo: 'exito',
            texto: `${config.titulo}: ${actualizado.name} (${actualizado.email}) ahora está ${actualizado.is_active ? 'activo' : 'desactivado'}.`,
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

        {mensaje && (
          <p
            className={`mod-mensaje ${
              mensaje.tipo === 'exito' ? 'mod-mensaje-exito' : 'mod-mensaje-error'
            }`}
            role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
          >
            {mensaje.texto}
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
                        <strong>Motivo:</strong> {reporte.reason}
                      </p>
                      {reporte.details && <p>{reporte.details}</p>}
                      {reporte.decision_notes && (
                        <p className="mod-nota">
                          Nota de decisión: {reporte.decision_notes}
                          {reporte.reviewed_at ? ` · ${fecha(reporte.reviewed_at)}` : ''}
                        </p>
                      )}
                      <div className="mod-acciones">
                        {reporte.reporter_id !== user?.id && (
                          <button
                            type="button"
                            className="pd-boton-claro"
                            onClick={() => cambiarPestana('usuarios', String(reporte.reporter_id))}
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

      {pendiente && configPendiente && (
        <div
          className="mod-overlay"
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
    </div>
  );
}