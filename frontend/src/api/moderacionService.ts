import type {
  EstadoReporte,
  ListaReportes,
  PublicacionModeracion,
  ReporteModeracion,
  TipoPublicacionModeracion,
  UsuarioModeracion,
} from '../types/moderacion';

export const MODO_SIMULADO = true;

const ESPERA_MS = 350;
const POR_PAGINA = 15;
const esperar = () => new Promise<void>((resolver) => { window.setTimeout(resolver, ESPERA_MS); });

function noConectado(): never {
  throw new Error('La API de moderación todavía no está conectada.');
}

let usuarios: UsuarioModeracion[] = [
  { id: 1, name: 'Centro Educativo Oaxaca', email: 'contacto@centroeducativo.mx', account_type: 'organizacion', is_active: true, created_at: '2026-09-02T10:00:00Z' },
  { id: 2, name: 'Alessandro Santiago', email: 'alessandro@itoaxaca.edu.mx', account_type: 'estudiante', is_active: true, created_at: '2026-09-10T15:30:00Z' },
  { id: 3, name: 'María Fernanda López', email: 'mflopez@gmail.com', account_type: 'academico', is_active: true, created_at: '2026-09-18T09:15:00Z' },
  { id: 4, name: 'Jorge Hernández', email: 'jhernandez@hotmail.com', account_type: 'residente_oaxaca', is_active: false, created_at: '2026-10-01T18:45:00Z' },
  { id: 5, name: 'AgroTech Oaxaca', email: 'info@agrotech.mx', account_type: 'organizacion', is_active: true, created_at: '2026-10-05T12:00:00Z' },
  { id: 6, name: 'Luis Ramírez', email: 'lramirez@outlook.com', account_type: 'empleado_organizacion', is_active: true, created_at: '2026-10-20T08:20:00Z' },
];

// Los proyectos y las necesidades viven en tablas distintas: un mismo id puede repetirse entre tipos.
let publicaciones: PublicacionModeracion[] = [
  { id: 11, type: 'proyecto', title: 'Dashboard de Métricas e Innovación', author_name: 'Clúster Tecnológico de Oaxaca', is_hidden: false, created_at: '2026-10-02T11:00:00Z' },
  { id: 12, type: 'proyecto', title: 'Catálogo de Flora y Fauna Oaxaqueña', author_name: 'CIIDIR Unidad Oaxaca - IPN', is_hidden: false, created_at: '2026-10-04T16:20:00Z' },
  { id: 13, type: 'necesidad', title: 'Instalación de Sistemas de Captación de Lluvia', author_name: 'Colonia Lomas de San Jacinto', is_hidden: false, created_at: '2026-10-09T09:00:00Z' },
  { id: 14, type: 'proyecto', title: 'App de Expediente Médico Rural', author_name: 'Salud Comunitarias Oaxaca A.C.', is_hidden: true, created_at: '2026-10-12T13:40:00Z' },
  { id: 15, type: 'necesidad', title: 'Taller de reciclaje para la comunidad', author_name: 'Jorge Hernández', is_hidden: false, created_at: '2026-10-18T17:10:00Z' },
  { id: 16, type: 'proyecto', title: 'Portal de Vinculación Universitaria', author_name: 'Centro Educativo Oaxaca', is_hidden: false, created_at: '2026-10-25T10:30:00Z' },
];

const MOTIVOS = ['Información incorrecta', 'Contenido duplicado', 'Datos de contacto personales', 'Lenguaje ofensivo', 'Publicidad no relacionada'];
const OBJETIVOS: Array<[number | null, number | null]> = [[12, null], [null, 13], [14, null], [16, null], [null, 15], [11, null]];

const reportesBase: ReporteModeracion[] = [
  { id: 101, reporter_id: 3, project_id: 12, community_need_id: null, reason: 'Información incorrecta', details: 'Varias especies aparecen con el nombre equivocado.', status: 'pending', reviewed_by: null, reviewed_at: null, decision_notes: null, created_at: '2026-11-12T09:00:00Z' },
  { id: 102, reporter_id: 6, project_id: 12, community_need_id: null, reason: 'Contenido duplicado', details: null, status: 'pending', reviewed_by: null, reviewed_at: null, decision_notes: null, created_at: '2026-11-12T08:30:00Z' },
  { id: 103, reporter_id: 2, project_id: null, community_need_id: 13, reason: 'Datos de contacto personales', details: 'Publica un número de teléfono en la descripción.', status: 'pending', reviewed_by: null, reviewed_at: null, decision_notes: null, created_at: '2026-11-11T08:15:00Z' },
  { id: 104, reporter_id: 1, project_id: 14, community_need_id: null, reason: 'Contenido duplicado', details: null, status: 'discarded', reviewed_by: 1, reviewed_at: '2026-11-10T10:00:00Z', decision_notes: 'No es duplicado, es otra versión.', created_at: '2026-11-09T10:00:00Z' },
  { id: 105, reporter_id: 5, project_id: null, community_need_id: 15, reason: 'Lenguaje ofensivo', details: 'Comentarios inapropiados en la descripción.', status: 'reviewed', reviewed_by: 1, reviewed_at: '2026-11-10T12:00:00Z', decision_notes: 'Se pidió al autor corregir el texto.', created_at: '2026-11-08T14:00:00Z' },
  ...Array.from({ length: 14 }, (_, i): ReporteModeracion => {
    const [proyecto, necesidad] = OBJETIVOS[i % OBJETIVOS.length];
    return {
      id: 106 + i,
      reporter_id: (i % 6) + 1,
      project_id: proyecto,
      community_need_id: necesidad,
      reason: MOTIVOS[i % MOTIVOS.length],
      details: i % 3 === 0 ? 'Detalle adicional proporcionado por quien reporta.' : null,
      status: i % 4 === 0 ? 'discarded' : 'pending',
      reviewed_by: i % 4 === 0 ? 1 : null,
      reviewed_at: i % 4 === 0 ? '2026-11-05T10:00:00Z' : null,
      decision_notes: i % 4 === 0 ? 'No procede.' : null,
      created_at: new Date(Date.UTC(2026, 10, 7, 12 - (i % 10), 0)).toISOString(),
    };
  }),
];

let reportes: ReporteModeracion[] = [...reportesBase].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);

export async function listarUsuariosModeracion(): Promise<UsuarioModeracion[]> {
  if (!MODO_SIMULADO) noConectado();
  await esperar();
  return usuarios.map((u) => ({ ...u }));
}

export async function listarPublicacionesModeracion(): Promise<PublicacionModeracion[]> {
  if (!MODO_SIMULADO) noConectado();
  await esperar();
  return publicaciones.map((p) => ({ ...p }));
}

export async function listarReportesModeracion(pagina = 1): Promise<ListaReportes> {
  if (!MODO_SIMULADO) noConectado();
  await esperar();
  const ultima = Math.max(1, Math.ceil(reportes.length / POR_PAGINA));
  const actual = Math.min(Math.max(1, pagina), ultima);
  const inicio = (actual - 1) * POR_PAGINA;
  return {
    reports: reportes.slice(inicio, inicio + POR_PAGINA).map((r) => ({ ...r })),
    meta: { current_page: actual, per_page: POR_PAGINA, last_page: ultima, total: reportes.length },
  };
}

export async function cambiarEstadoUsuario(id: number, activo: boolean): Promise<UsuarioModeracion> {
  if (!MODO_SIMULADO) noConectado();
  await esperar();
  const usuario = usuarios.find((u) => u.id === id);
  if (!usuario) throw new Error('Usuario no encontrado.');
  usuario.is_active = activo;
  return { ...usuario };
}

export async function cambiarVisibilidadPublicacion(
  tipo: TipoPublicacionModeracion,
  id: number,
  oculta: boolean,
): Promise<PublicacionModeracion> {
  if (!MODO_SIMULADO) noConectado();
  await esperar();
  const publicacion = publicaciones.find((p) => p.type === tipo && p.id === id);
  if (!publicacion) throw new Error('Publicación no encontrada.');
  publicacion.is_hidden = oculta;
  return { ...publicacion };
}

/** status 'pending' reabre el reporte (el backend borra las notas). Con 'reviewed' o 'discarded' las notas son obligatorias. */
export async function resolverReporte(id: number, status: EstadoReporte, notas?: string): Promise<ReporteModeracion> {
  if (!MODO_SIMULADO) noConectado();
  await esperar();
  const reporte = reportes.find((r) => r.id === id);
  if (!reporte) throw new Error('Reporte no encontrado.');
  reporte.status = status;
  if (status === 'pending') {
    reporte.reviewed_by = null;
    reporte.reviewed_at = null;
    reporte.decision_notes = null;
  } else {
    reporte.reviewed_by = 1;
    reporte.reviewed_at = new Date().toISOString();
    reporte.decision_notes = notas ?? '';
  }
  return { ...reporte };
}