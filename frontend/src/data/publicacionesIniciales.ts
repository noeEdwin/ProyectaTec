import type { PublicacionPanel, SolicitudPanel } from '../types/publicacionesPanel';

/**
 * SOLO REFERENCIA VISUAL Figma para la vista sin API.
 * No son registros reales. Reemplazar mediante las props del panel
 * cuando el responsable de integración conecte Laravel.
 */
export const publicacionesIniciales: PublicacionPanel[] = [
  {
    id: null, tipo: 'proyecto',
    titulo: 'Automatización de riego y monitoreo para agave Tobalá',
    organizacion: 'Cooperativa Magueyera San Dionisio Ocotepec',
    categoria: 'Agroindustria', estado: 'En ejecución',
    ubicacion: 'Oaxaca', modalidad: 'Colaboración',
    participantes: 'Cooperativa San Dionisio · Instituto Tecnológico de Oaxaca',
    etapaActual: 4, etapasTotales: 5,
  },
  {
    id: null, tipo: 'proyecto', titulo: 'Desfibradora de penca con motor eléctrico sustentable',
    organizacion: 'Magueyes de Miahuatlán', categoria: 'Manufactura', estado: 'En curso',
  },
  {
    id: null, tipo: 'necesidad', titulo: 'Trazabilidad y autenticación textil zapoteca',
    organizacion: 'Artesanos de Teotitlán del Valle', categoria: 'Textil', estado: 'Convocatoria',
  },
];
export const solicitudesIniciales: SolicitudPanel[] = [
  { id: null, nombre: 'Carlos Jair Cruz Hernández', descripcion: 'Colaboración · Agroindustria' },
  { id: null, nombre: 'Diana Laura Mendoza', descripcion: 'Colaboración · Agroindustria' },
];
