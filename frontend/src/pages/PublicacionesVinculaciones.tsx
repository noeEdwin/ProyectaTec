import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listarCategorias,
  listarMisPublicaciones,
  type MiPublicacion,
} from '../api/publicacionesService';
import {
  extraerMensajeErrorVinculacion,
  listarAvancesProyecto,
  listarMisSolicitudesEnviadas,
  listarParticipantesProyecto,
  listarSolicitudesProyecto,
} from '../api/vinculacionSeguimientoService';
import type {
  PublicacionPanel,
  SolicitudPanel,
} from '../types/publicacionesPanel';
import '../styles/publicacionesPanel.css';

type SolicitudPanelConProyecto = SolicitudPanel & {
  projectId?: number;
};

type Props = {
  publicaciones?: PublicacionPanel[];
  solicitudes?: SolicitudPanelConProyecto[];
  cargando?: boolean;
  error?: string | null;
};

const ESTADOS_PUBLICACION: Record<string, string> = {
  draft: 'Borrador',
  open: 'Activa',
  in_progress: 'En ejecución',
  completed: 'Completada',
  closed: 'Cerrada',
  withdrawn: 'Retirada',
};

function mapearPublicacionPanel(
  pub: MiPublicacion,
  categoriasMap: Map<number, string>,
): PublicacionPanel {
  return {
    id: pub.id,
    tipo: pub.type,
    titulo: pub.title,
    organizacion:
      pub.type === 'proyecto' ? 'Proyecto propio' : 'Necesidad propia',
    categoria: categoriasMap.get(pub.category_id) ?? 'General',
    estado: ESTADOS_PUBLICACION[pub.status] ?? pub.status,
  };
}

export default function PublicacionesVinculaciones({
  publicaciones,
  solicitudes,
  cargando,
  error,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'Todas' | 'Activas' | 'Cerradas'>(
    'Todas',
  );

  const [publicacionesReales, setPublicacionesReales] = useState<
    PublicacionPanel[]
  >([]);
  const [solicitudesReales, setSolicitudesReales] = useState<
    SolicitudPanelConProyecto[]
  >([]);
  const [cargandoLocal, setCargandoLocal] = useState(
    publicaciones === undefined || solicitudes === undefined,
  );
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const esControlado =
    publicaciones !== undefined && solicitudes !== undefined;

  useEffect(() => {
    if (esControlado) return;

    let activo = true;

    async function cargarDatosReales() {
      setCargandoLocal(true);
      setErrorLocal(null);

      try {
        const [misPubs, categorias, enviadas] = await Promise.all([
          listarMisPublicaciones(),
          listarCategorias().catch(() => []),
          listarMisSolicitudesEnviadas().catch(() => []),
        ]);

        if (!activo) return;

        const categoriasMap = new Map<number, string>(
          categorias.map((c) => [c.id, c.name]),
        );

        const pubsMapeadas = misPubs.map((p) =>
          mapearPublicacionPanel(p, categoriasMap),
        );

        const proyectosPropios = misPubs.filter(
          (p) => p.type === 'proyecto',
        );

        const [listasRecibidas, seguimientoProyectos] = await Promise.all([
          Promise.all(
            proyectosPropios.map((proy) =>
              listarSolicitudesProyecto(proy.id).catch(() => []),
            ),
          ),
          Promise.all(
            proyectosPropios.map(async (proy) => {
              const [avancesRes, miembros] = await Promise.all([
                listarAvancesProyecto(proy.id).catch(() => null),
                listarParticipantesProyecto(proy.id).catch(() => []),
              ]);
              return {
                projectId: proy.id,
                progreso: avancesRes?.ultimoProgreso?.progress ?? null,
                participantes:
                  miembros.length > 0
                    ? miembros.map((m) => m.user.name).join(', ')
                    : 'Sin participantes aceptados aún',
              };
            }),
          ),
        ]);

        if (!activo) return;

        const seguimientoMap = new Map(
          seguimientoProyectos.map((item) => [item.projectId, item]),
        );

        const pubsEnriquecidas = pubsMapeadas.map((pub) => {
          if (pub.tipo !== 'proyecto' || pub.id === null) return pub;
          const info = seguimientoMap.get(pub.id);
          if (!info) return pub;
          return {
            ...pub,
            progresoPorcentaje: info.progreso,
            participantes: info.participantes,
          };
        });

        const recibidasPanel: SolicitudPanelConProyecto[] = listasRecibidas
          .flat()
          .map((s) => ({
            id: s.id,
            projectId: s.project_id,
            nombre:
              s.applicant?.display_name?.trim() ||
              s.applicant?.name ||
              'Solicitante',
            descripcion: s.project?.title
              ? `Recibida · ${s.project.title}`
              : 'Solicitud recibida',
          }));

        const enviadasPanel: SolicitudPanelConProyecto[] = enviadas.map((s) => ({
          id: s.id,
          projectId: s.project_id,
          nombre: s.project?.title ?? `Proyecto #${s.project_id}`,
          descripcion: `Enviada · ${
            s.status === 'accepted'
              ? 'Aceptada'
              : s.status === 'rejected'
                ? 'Rechazada'
                : 'Pendiente'
          }`,
        }));

        setPublicacionesReales(pubsEnriquecidas);
        setSolicitudesReales([...recibidasPanel, ...enviadasPanel]);
      } catch (err: unknown) {
        if (!activo) return;
        setErrorLocal(
          extraerMensajeErrorVinculacion(
            err,
            'No se pudieron cargar tus publicaciones y vinculaciones.',
          ),
        );
      } finally {
        if (activo) setCargandoLocal(false);
      }
    }

    void cargarDatosReales();

    return () => {
      activo = false;
    };
  }, [esControlado]);

  const listaPublicaciones = publicaciones ?? publicacionesReales;
  const listaSolicitudes = solicitudes ?? solicitudesReales;
  const estaCargando = cargando ?? cargandoLocal;
  const mensajeError = error !== undefined ? error : errorLocal;

  const filtradas = useMemo(
    () =>
      listaPublicaciones.filter((item) => {
        const texto = `${item.titulo} ${item.organizacion} ${item.categoria}`.toLocaleLowerCase(
          'es-MX',
        );
        const coincide = texto.includes(
          busqueda.trim().toLocaleLowerCase('es-MX'),
        );
        const cerrado = ['Cerrada', 'Completada', 'Retirada'].includes(
          item.estado,
        );
        return (
          coincide &&
          (filtro === 'Todas' || (filtro === 'Cerradas' ? cerrado : !cerrado))
        );
      }),
    [listaPublicaciones, busqueda, filtro],
  );

  const destacada = filtradas[0];
  const adicionales = filtradas.slice(1);
  const enCurso = listaPublicaciones.filter((p) =>
    ['En curso', 'En ejecución', 'Activa'].includes(p.estado),
  ).length;

  function enlaceDetalle(item: PublicacionPanel) {
    if (item.id === null) {
      return (
        <span className="pav-enlace pav-no-disponible">
          Ver publicación →
        </span>
      );
    }
    return (
      <Link
        className="pav-enlace"
        to={`/publicaciones/${item.tipo}/${item.id}`}
      >
        Ver publicación →
      </Link>
    );
  }

  return (
    <main className="pav-pagina">
      <div className="pav-contenedor">
        <header className="pav-cabecera">
          <div>
            <span className="pav-eyebrow">GESTIÓN DE VINCULACIÓN</span>
            <h1>Publicaciones y vinculaciones</h1>
            <p>
              Gestiona iniciativas, solicitudes y colaboraciones desde un solo
              lugar.
            </p>
          </div>
          <Link to="/publicaciones/nueva" className="pav-boton-principal">
            Nueva publicación +
          </Link>
        </header>

        <section
          className="pav-filtros"
          aria-label="Buscar y filtrar publicaciones"
        >
          <div className="pav-busqueda">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Buscar publicaciones"
              placeholder="Buscar publicaciones o proyectos…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="pav-pildoras">
            {(['Todas', 'Activas', 'Cerradas'] as const).map((estado) => (
              <button
                key={estado}
                type="button"
                aria-pressed={filtro === estado}
                className={filtro === estado ? 'pav-activa' : ''}
                onClick={() => setFiltro(estado)}
              >
                {estado}
              </button>
            ))}
          </div>
          <span className="pav-total">{filtradas.length} publicaciones</span>
        </section>

        {estaCargando && (
          <p className="pav-estado" role="status">
            Cargando publicaciones…
          </p>
        )}
        {mensajeError && (
          <p className="pav-estado pav-error" role="alert">
            {mensajeError}
          </p>
        )}
        {!estaCargando && !mensajeError && filtradas.length === 0 && (
          <p className="pav-estado" role="status">
            No se encontraron publicaciones para la búsqueda o filtro
            seleccionados.
          </p>
        )}

        {!estaCargando && !mensajeError && (
          <>
            <section
              className="pav-principal"
              aria-label="Publicación destacada y resumen"
            >
              {destacada ? (
                <article className="pav-tarjeta pav-destacada">
                  <div className="pav-destacada-top">
                    <span className="pav-etiqueta">PUBLICACIÓN DESTACADA</span>
                    <span className="pav-estado-publicacion">
                      {destacada.estado}
                    </span>
                  </div>
                  <h2>{destacada.titulo}</h2>
                  <p className="pav-organizacion">{destacada.organizacion}</p>
                  <div className="pav-metadata">
                    <div>
                      <small>SECTOR</small>
                      <strong>{destacada.categoria}</strong>
                    </div>
                    <div>
                      <small>UBICACIÓN</small>
                      <strong>{destacada.ubicacion ?? 'Sin especificar'}</strong>
                    </div>
                    <div>
                      <small>MODALIDAD</small>
                      <strong>{destacada.modalidad ?? 'Sin especificar'}</strong>
                    </div>
                  </div>
                  <div className="pav-seguimiento">
                    <div className="pav-seguimiento-cabecera">
                      <strong>Seguimiento</strong>
                      <span>
                        {typeof destacada.progresoPorcentaje === 'number'
                          ? `${destacada.estado} · ${destacada.progresoPorcentaje}% de avance`
                          : destacada.etapaActual && destacada.etapasTotales
                            ? `${destacada.estado} · Etapa ${destacada.etapaActual} de ${destacada.etapasTotales}`
                            : destacada.estado}
                      </span>
                    </div>
                    <div className="pav-progreso">
                      <div
                        style={{
                          width:
                            typeof destacada.progresoPorcentaje === 'number'
                              ? `${Math.min(100, Math.max(0, destacada.progresoPorcentaje))}%`
                              : destacada.etapaActual && destacada.etapasTotales
                                ? `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      (destacada.etapaActual /
                                        destacada.etapasTotales) *
                                        100,
                                    ),
                                  )}%`
                                : '0%',
                        }}
                      />
                    </div>
                    <div className="pav-pie">
                      <div>
                        <small>Participantes</small>
                        <p>
                          {destacada.participantes ??
                            'Sin información disponible'}
                        </p>
                      </div>
                      {enlaceDetalle(destacada)}
                    </div>
                  </div>
                </article>
              ) : (
                <div className="pav-tarjeta pav-estado">
                  Sin publicación destacada
                </div>
              )}

              <aside className="pav-lateral">
                <section className="pav-tarjeta pav-resumen">
                  <h2>Resumen</h2>
                  <div className="pav-estadisticas">
                    <div>
                      <strong>{listaPublicaciones.length}</strong>
                      <span>Publicaciones</span>
                    </div>
                    <div>
                      <strong>{enCurso}</strong>
                      <span>En ejecución</span>
                    </div>
                    <div>
                      <strong>{listaSolicitudes.length}</strong>
                      <span>Solicitudes</span>
                    </div>
                  </div>
                </section>

                <section className="pav-tarjeta pav-solicitudes">
                  <div className="pav-seccion-titulo">
                    <h2>Solicitudes recientes</h2>
                    <Link
                      className="pav-enlace"
                      to={
                        listaSolicitudes.find((s) => s.descripcion.startsWith('Recibida') && s.projectId)?.projectId
                          ? `/mis-publicaciones/${listaSolicitudes.find((s) => s.descripcion.startsWith('Recibida') && s.projectId)?.projectId}/solicitudes`
                          : '/mis-solicitudes'
                      }
                    >
                      Ver todas →
                    </Link>
                  </div>
                  {listaSolicitudes.length === 0 && (
                    <p>No hay solicitudes recientes.</p>
                  )}
                  {listaSolicitudes.slice(0, 3).map((s, i) => (
                    <div
                      className="pav-solicitud"
                      key={`${s.id ?? 'solicitud'}-${i}`}
                    >
                      <span className="pav-avatar">
                        {s.nombre
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <div>
                        <strong>{s.nombre}</strong>
                        <small>{s.descripcion}</small>
                      </div>
                      <Link
                        className="pav-enlace"
                        to={
                          s.descripcion.startsWith('Recibida') && s.projectId
                            ? `/mis-publicaciones/${s.projectId}/solicitudes`
                            : '/mis-solicitudes'
                        }
                      >
                        Ver →
                      </Link>
                    </div>
                  ))}
                </section>
              </aside>
            </section>

            <section className="pav-tarjeta pav-otras">
              <div className="pav-seccion-titulo">
                <h2>Otras publicaciones</h2>
                <Link className="pav-enlace" to="/mis-publicaciones">
                  Ver mis publicaciones →
                </Link>
              </div>
              <div className="pav-otras-grid">
                {adicionales.length === 0 && (
                  <p>No hay publicaciones adicionales.</p>
                )}
                {adicionales.map((item, i) => (
                  <article
                    className="pav-otra"
                    key={`${item.tipo}-${item.id ?? i}`}
                  >
                    <div>
                      <h3>{item.titulo}</h3>
                      <p>{item.organizacion}</p>
                    </div>
                    {item.id ? (
                      <Link
                        className="pav-enlace"
                        to={`/publicaciones/${item.tipo}/${item.id}`}
                      >
                        {item.estado} →
                      </Link>
                    ) : (
                      <span>{item.estado}</span>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}