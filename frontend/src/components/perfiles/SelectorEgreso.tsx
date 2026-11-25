import { PERIODOS_EGRESO, fechaActualYm, periodoDeMes, validarFechaEgreso } from '../../utils/fechaEgreso';

type SelectorEgresoProps = {
  idPrefix: string;
  value: string;
  onChange: (ym: string) => void;
  invalid?: boolean;
};

export default function SelectorEgreso({
  idPrefix,
  value,
  onChange,
  invalid = false,
}: SelectorEgresoProps) {
  const actual = fechaActualYm();
  const anios = Array.from({ length: 11 }, (_, idx) => String(actual.year + idx));

  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  const anioActual = match ? match[1] : '';
  const periodoActual = match ? periodoDeMes(match[2]) : '';

  const esAnioEnCurso = anioActual === String(actual.year);
  const errorFormato = value.trim() ? validarFechaEgreso(value) : null;

  function actualizar(nuevoPeriodo: string, nuevoAnio: string) {
    if (!nuevoPeriodo && !nuevoAnio) {
      onChange('');
      return;
    }
    const anio = nuevoAnio || String(actual.year);
    let periodo = nuevoPeriodo || (actual.month <= 6 ? '06' : '12');
    if (anio === String(actual.year) && Number(periodo) < actual.month) {
      periodo = '12';
    }
    onChange(`${anio}-${periodo}`);
  }

  return (
    <div>
      <div className="selector-egreso-grid">
        <select
          id={idPrefix}
          aria-label="Periodo académico estimado de egreso"
          value={periodoActual}
          onChange={(e) => actualizar(e.target.value, anioActual)}
          aria-invalid={invalid || Boolean(errorFormato)}
        >
          <option value="">Periodo académico</option>
          {PERIODOS_EGRESO.map((p) => (
            <option
              key={p.value}
              value={p.value}
              disabled={esAnioEnCurso && Number(p.value) < actual.month}
            >
              {p.label}
            </option>
          ))}
        </select>

        <select
          id={`${idPrefix}-year`}
          aria-label="Año estimado de egreso"
          value={anioActual}
          onChange={(e) => actualizar(periodoActual, e.target.value)}
          aria-invalid={invalid || Boolean(errorFormato)}
        >
          <option value="">Año</option>
          {anioActual && !anios.includes(anioActual) && (
            <option value={anioActual}>{anioActual}</option>
          )}
          {anios.map((anio) => (
            <option key={anio} value={anio}>
              {anio}
            </option>
          ))}
        </select>
      </div>
      {errorFormato ? (
        <p className="formato-ayuda invalido">{errorFormato}</p>
      ) : (
        <p className="formato-ayuda">
          Selecciona tu periodo académico de egreso (ej. Agosto – Diciembre {actual.year}).
        </p>
      )}
    </div>
  );
}
