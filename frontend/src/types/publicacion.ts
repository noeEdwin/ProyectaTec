// Ruta a la que se vuelve después de guardar o cancelar
export const RUTA_PUBLICACIONES = '/mis-publicaciones';
export type TipoPublicacion = 'proyecto' | 'necesidad';

export const TIPOS_PUBLICACION: {
  value: TipoPublicacion;
  label: string;
  descripcion: string;
}[] = [
  {
    value: 'proyecto',
    label: 'Proyecto',
    descripcion: 'Iniciativa con modalidad, fechas y equipo de colaboración.',
  },
  {
    value: 'necesidad',
    label: 'Necesidad comunitaria',
    descripcion: 'Problema u oportunidad que una comunidad quiere atender.',
  },
];

export type Modalidad = 'presencial' | 'hibrida' | 'remota';

export const MODALIDADES: { value: Modalidad; label: string }[] = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'hibrida', label: 'Híbrida' },
  { value: 'remota', label: 'Remota' },
];

export type Categoria = {
  id: number;
  name: string;
};

export const LIMITES = {
  titulo: { min: 5, max: 150 },
  descripcion: { min: 20, max: 2000 },
  ubicacion: { max: 255 },
} as const;

export type PublicacionFormValues = {
  tipo: TipoPublicacion;
  title: string;
  category_id: string;
  modality: string; 
  location: string;
  starts_at: string; 
  ends_at: string;
  description: string;
};

export const VALORES_INICIALES: PublicacionFormValues = {
  tipo: 'proyecto',
  title: '',
  category_id: '',
  modality: '',
  location: '',
  starts_at: '',
  ends_at: '',
  description: '',
};

export type PublicacionPayload =
  | {
      type: 'project';
      title: string;
      description: string;
      category_id: number;
      modality: Modalidad | null;
      location: string | null;
      starts_at: string | null;
      ends_at: string | null;
    }
  | {
      type: 'community_need';
      title: string;
      description: string;
      category_id: number;
      location: string | null;
    };

export type PublicacionErrors = Partial<
  Record<keyof PublicacionFormValues | 'general', string>
>;
