import type { PublicacionListado } from '../api/publicacionesService';

/** Modelo visual: no realiza peticiones ni almacena datos ficticios. */
export type Iniciativa = {
  id: number;
  tipo: 'proyecto' | 'necesidad';
  titulo: string;
  categoria: string;
  estado: string;
  organizacion: string;
  ubicacion: string;
};

export function adaptarIniciativa(item: PublicacionListado): Iniciativa {
  const estados: Record<string, string> = {
    open: 'Abierta',
    in_progress: 'En curso',
    completed: 'Completada',
    active: 'Activa',
    closed: 'Cerrada',
    draft: 'Borrador',
    withdrawn: 'Retirada',
  };
  return {
    id: item.id,
    tipo: item.type,
    titulo: item.title,
    categoria: item.category?.name?.toUpperCase() ?? `SECTOR ${item.category_id}`,
    estado: estados[item.status] ?? item.status,
    organizacion: item.organization?.name ?? item.location ?? (
      item.type === 'necesidad' ? 'Comunidad de Oaxaca' : 'Iniciativa ProyectaTec'
    ),
    ubicacion: item.location ?? '',
  };
}

/** "CULTURA Y ARTE" -> "Cultura y arte". Se usa para los botones de filtro y para comparar. */
export function etiquetaCategoria(categoria: string): string {
  const texto = categoria.trim().toLocaleLowerCase('es-MX');
  return texto.charAt(0).toLocaleUpperCase('es-MX') + texto.slice(1);
}

/** Categorías que realmente existen en las publicaciones cargadas, sin repetir y en orden alfabético. */
export function categoriasDe(items: Iniciativa[]): string[] {
  return [...new Set(items.map((item) => etiquetaCategoria(item.categoria)))]
    .sort((a, b) => a.localeCompare(b, 'es-MX'));
}

export function filtrarIniciativas(
  items: Iniciativa[],
  texto: string,
  categoria: string = 'Todos',
): Iniciativa[] {
  const consulta = texto.trim().toLocaleLowerCase('es-MX');
  const categoriaBuscada = etiquetaCategoria(categoria);
  return items.filter((item) => {
    const coincideTexto = [item.titulo, item.categoria, item.organizacion, item.ubicacion]
      .join(' ').toLocaleLowerCase('es-MX').includes(consulta);
    const coincideCategoria = categoria === 'Todos' || etiquetaCategoria(item.categoria) === categoriaBuscada;
    return coincideTexto && coincideCategoria;
  });
}