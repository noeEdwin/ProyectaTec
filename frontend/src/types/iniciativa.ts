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

export function filtrarIniciativas(
  items: Iniciativa[],
  texto: string,
  categoria: string = 'Todos',
): Iniciativa[] {
  const consulta = texto.trim().toLocaleLowerCase('es-MX');
  return items.filter((item) => {
    const coincideTexto = [item.titulo, item.categoria, item.organizacion, item.ubicacion]
      .join(' ').toLocaleLowerCase('es-MX').includes(consulta);
    const sector = item.categoria.toLocaleLowerCase('es-MX');
    const otros = !['agroindustria', 'software', 'ia', 'turismo'].some((valor) => sector.includes(valor));
    const coincideCategoria = categoria === 'Todos' || (categoria === 'Otros sectores'
      ? otros : sector.includes(categoria.toLocaleLowerCase('es-MX')));
    return coincideTexto && coincideCategoria;
  });
}
