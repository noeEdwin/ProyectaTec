/** Reglas y listas compartidas por Registro, Perfil y Editar organización. */

export const SECTORES = [
  'Tecnología e innovación', 'Agroindustria y campo', 'Educación y capacitación', 'Salud y bienestar',
  'Turismo', 'Artesanías y cultura', 'Medio ambiente y energía', 'Comercio y servicios',
  'Manufactura e industria', 'Gobierno', 'Desarrollo social y comunitario', 'Otro',
] as const;

export const SEMESTRES = [
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}° semestre` })),
  { value: 'egresado', label: 'Egresado/a' },
];

const LETRAS = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]/g;
const LETRAS_NUM = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,'#°-]/g;

// Matrícula: ajusta este patrón si el ITO usa otro formato.
export const MATRICULA_RE = /^\d{8,10}$/;

export type ReglaCampo = {
  filtrar?: (valor: string) => string;
  valido?: (valor: string) => boolean;
  mensaje?: string;
  maxLength?: number;
};

export const REGLAS_CAMPO: Record<string, ReglaCampo> = {
  phone: { filtrar: (v) => v.replace(/\D/g, '').slice(0, 10), valido: (v) => /^\d{10}$/.test(v), mensaje: 'Ingresa un teléfono de 10 dígitos, solo números.', maxLength: 10 },
  organization_phone: { filtrar: (v) => v.replace(/\D/g, '').slice(0, 10), valido: (v) => /^\d{10}$/.test(v), mensaje: 'Ingresa un teléfono de 10 dígitos, solo números.', maxLength: 10 },
  student_number: { filtrar: (v) => v.replace(/\D/g, '').slice(0, 10), valido: (v) => MATRICULA_RE.test(v), mensaje: 'La matrícula debe tener de 8 a 10 dígitos.', maxLength: 10 },
  field_of_study: { filtrar: (v) => v.replace(LETRAS, ''), valido: (v) => v.trim().length >= 3, mensaje: 'Escribe tu carrera o programa (solo letras).' },
  organization_position: { filtrar: (v) => v.replace(LETRAS, ''), valido: (v) => v.trim().length >= 2, mensaje: 'Escribe un cargo válido (solo letras).' },
  organization_area: { filtrar: (v) => v.replace(LETRAS, ''), valido: (v) => v.trim().length >= 2, mensaje: 'Escribe un área válida (solo letras).' },
  locality: { filtrar: (v) => v.replace(LETRAS_NUM, ''), valido: (v) => v.trim().length >= 2, mensaje: 'Escribe un nombre válido de colonia, barrio o comunidad.' },
  campus: { filtrar: (v) => v.replace(LETRAS_NUM, ''), valido: (v) => v.trim().length >= 2, mensaje: 'Escribe un campus o plantel válido.' },
};

export function filtrarCampo(clave: string, valor: string): string {
  const regla = REGLAS_CAMPO[clave];
  return regla?.filtrar ? regla.filtrar(valor) : valor;
}

/** Devuelve el mensaje de error, o null si el valor está vacío o es válido. */
export function validarCampo(clave: string, valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim();
  const regla = REGLAS_CAMPO[clave];
  if (!texto || !regla?.valido) return null;
  return regla.valido(texto) ? null : (regla.mensaje ?? 'Dato no válido.');
}

/** Formato de ubicación: "Colonia, Municipio, Oaxaca, México". */
export function ubicacionOaxaca(municipio: string, colonia: string): string {
  return [colonia.trim(), municipio.trim(), 'Oaxaca', 'México'].filter(Boolean).join(', ');
}

/** Inverso de ubicacionOaxaca. Si no reconoce el formato, devuelve todo como colonia. */
export function separarUbicacionOaxaca(ubicacion: string, municipios: readonly string[]): { municipio: string; colonia: string } {
  const partes = ubicacion.split(',').map((p) => p.trim()).filter(Boolean);
  while (partes.length && ['México', 'Oaxaca'].includes(partes[partes.length - 1])) partes.pop();
  const municipio = partes[partes.length - 1] ?? '';
  if (partes.length >= 2 && municipios.includes(municipio)) {
    return { municipio, colonia: partes.slice(0, -1).join(', ') };
  }
  return { municipio: '', colonia: ubicacion };
}

/** Agrega el valor actual a la lista si no está (por datos anteriores a la lista cerrada). */
export function opcionesConActual(lista: readonly string[], actual: string): string[] {
  return actual && !lista.includes(actual) ? [...lista, actual] : [...lista];
}