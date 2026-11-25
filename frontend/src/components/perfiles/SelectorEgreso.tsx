import { MESES_ES, fechaActualYm, validarFechaEgreso } from '../../utils/fechaEgreso';

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
  const mesActual = match ? match[2] : '';

  const esAnioEnCurso = anioActual === String(actual.year);
  const errorFormato = value.trim() ? validarFechaEgreso(value) : null;

  function actualizar(nuevoMes: string, nuevoAnio: string) {
    if (!nuevoMes && !nuevoAnio) {
      onChange('');
      return;
    }
    const anio = nuevoAnio || String(actual.year);
    let mes = nuevoMes || String(actual.month).padStart(2, '0');
    if (anio === String(actual.year) && Number(mes) < actual.month) {
      mes = String(actual.month).padStart(2, '0');
    }
    onChange(`${anio}-${mes}`);
  }

  return (
    <div>
      <div className="selector-egreso-grid">
        <select
          id={idPrefix}
          aria-label="Mes estimado de egreso"
          value={mesActual}
          onChange={(e) => actualizar(e.target.value, anioActual)}
          aria-invalid={invalid || Boolean(errorFormato)}
        >
          <option value="">Mes</option>
          {MESES_ES.map((m) => (
            <option
              key={m.value}
              value={m.value}
              disabled={esAnioEnCurso && Number(m.value) < actual.month}
            >
              {m.label}
            </option>
          ))}
        </select>

        <select
          id={`${idPrefix}-year`}
          aria-label="Año estimado de egreso"
          value={anioActual}
          onChange={(e) => actualizar(mesActual, e.target.value)}
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
          Debe ser igual o posterior a {MESES_ES[actual.month - 1].label} {actual.year}.
        </p>
      )}
    </div>
  );
}
