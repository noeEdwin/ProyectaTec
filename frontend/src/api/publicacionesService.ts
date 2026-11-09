import type {
  Categoria,
  PublicacionFormValues,
  PublicacionPayload,
  TipoPublicacion,
} from '../types/publicacion';


const MODO_DEMO = import.meta.env.DEV;
const NO_CONECTADO = 'La API de publicaciones todavía no está conectada.';

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));


const CATEGORIAS_DEMO: Categoria[] = [
  { id: 1, name: 'Tecnología e innovación' },
  { id: 2, name: 'Agroindustria y alimentos' },
  { id: 3, name: 'Energías renovables' },
  { id: 4, name: 'Educación y formación' },
  { id: 5, name: 'Salud y bienestar' },
  { id: 6, name: 'Turismo y cultura' },
  { id: 7, name: 'Medio ambiente y sustentabilidad' },
  { id: 8, name: 'Desarrollo comunitario' },
];

/** GET de categorías (tabla categories). */
export async function listarCategorias(): Promise<Categoria[]> {
  if (MODO_DEMO) {
    await espera(300);
    return CATEGORIAS_DEMO;
  }
  throw new Error(NO_CONECTADO);
}


export async function crearPublicacion(
  payload: PublicacionPayload,
): Promise<{ id: number }> {
  if (MODO_DEMO) {
    console.warn('[DEMO] crearPublicacion (no se envió a ninguna API):', payload);
    await espera(600);
    return { id: 1 };
  }
  throw new Error(NO_CONECTADO);
}

/** PUT/PATCH de la publicación existente (mismo payload que al crear). */
export async function actualizarPublicacion(
  tipo: TipoPublicacion,
  id: number,
  payload: PublicacionPayload,
): Promise<void> {
  if (MODO_DEMO) {
    console.warn(`[DEMO] actualizarPublicacion ${tipo} #${id}:`, payload);
    await espera(600);
    return;
  }
  throw new Error(NO_CONECTADO);
}


export async function obtenerPublicacion(
  tipo: TipoPublicacion,
  id: number,
): Promise<Partial<PublicacionFormValues>> {
  if (MODO_DEMO) {
    await espera(400);
    return tipo === 'proyecto'
      ? {
          tipo,
          title: `Huerto escolar sustentable #${id}`,
          category_id: '2',
          modality: 'hibrida',
          location: 'Valles Centrales, Oaxaca',
          starts_at: '2026-12-01',
          ends_at: '2027-05-30',
          description:
            'Proyecto para instalar huertos escolares con sistemas de riego de bajo costo y capacitar a docentes y familias.',
        }
      : {
          tipo,
          title: `Acceso a agua potable en la comunidad #${id}`,
          category_id: '8',
          location: 'Sierra Sur, Oaxaca',
          description:
            'La comunidad necesita apoyo técnico para captar y almacenar agua de lluvia durante la temporada seca.',
        };
  }
  throw new Error(NO_CONECTADO);
}