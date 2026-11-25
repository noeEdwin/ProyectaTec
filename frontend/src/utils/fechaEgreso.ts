export const MESES_ES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export const PERIODOS_EGRESO = [
  { value: '06', label: 'Enero – Junio' },
  { value: '12', label: 'Agosto – Diciembre' },
] as const;

export function periodoDeMes(mes: string): string {
  const n = Number(mes);
  if (!Number.isFinite(n) || n < 1 || n > 12) return '';
  return n <= 6 ? '06' : '12';
}

export function formatearPeriodoEgreso(valor: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(valor.trim());
  if (!match) return valor;
  const periodo = PERIODOS_EGRESO.find((p) => p.value === periodoDeMes(match[2]));
  return periodo ? `${periodo.label} ${match[1]}` : valor;
}

export function fechaActualYm(): { year: number; month: number; ym: string } {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = ahora.getMonth() + 1;
  return {
    year,
    month,
    ym: `${year}-${String(month).padStart(2, '0')}`,
  };
}

export function validarFechaEgreso(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio) {
    return 'Selecciona el mes y año estimado de egreso.';
  }
  const match = /^(\d{4})-(\d{2})$/.exec(limpio);
  if (!match) {
    return 'Selecciona un mes y un año válidos.';
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return 'Selecciona un mes válido.';
  }
  const actual = fechaActualYm();
  if (year < actual.year || (year === actual.year && month < actual.month)) {
    return 'La fecha estimada de egreso no puede ser anterior al mes actual.';
  }
  if (year > actual.year + 12) {
    return `El año de egreso no puede superar ${actual.year + 12}.`;
  }
  return null;
}
