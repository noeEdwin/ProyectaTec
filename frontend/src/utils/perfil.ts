export function inicialesPerfil(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter((palabra) =>
    !['de', 'del', 'la', 'el', 'los', 'las', 'y'].includes(palabra.toLowerCase())
  );
  return palabras.slice(0, 2).map((palabra) => palabra[0].toUpperCase()).join('') || 'PT';
}
