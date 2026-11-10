/** Contrato provisional de props para un panel visual sin integración HTTP. */
export type PublicacionPanel = {
  id: number | null;
  tipo: 'proyecto' | 'necesidad';
  titulo: string;
  organizacion: string;
  categoria: string;
  estado: string;
  ubicacion?: string;
  modalidad?: string;
  participantes?: string;
  etapaActual?: number;
  etapasTotales?: number;
};
export type SolicitudPanel = {
  id: number | null;
  nombre: string;
  descripcion: string;
};
