import { useState } from 'react';
import '../../styles/camposPerfil.css';

const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

type Props = {
  value: string;
  onChange: (location: string) => void;
  idPrefix: string;
};

export default function SelectorUbicacion({ value, onChange, idPrefix }: Props) {
  const [manualSelected, setManualSelected] = useState(false);
  const state = value.endsWith(', México') ? value.slice(0, -', México'.length) : '';
  const knownMexico = value === 'México' || ESTADOS_MEXICO.includes(state);
  const mode = manualSelected || (value && !knownMexico) ? 'manual' : value ? 'mexico' : '';

  return (
    <fieldset className="campos-perfil-grupo">
      <legend>Ubicación (opcional)</legend>
      <div className="campos-perfil-ubicacion">
        <div>
          <label htmlFor={`${idPrefix}-pais`}>País</label>
          <select
            id={`${idPrefix}-pais`}
            value={mode}
            onChange={(event) => {
              const selected = event.target.value;
              setManualSelected(selected === 'manual');
              onChange(selected === 'mexico' ? 'México' : '');
            }}
          >
            <option value="">Selecciona un país</option>
            <option value="mexico">México</option>
            <option value="manual">Otra ubicación / escribir</option>
          </select>
        </div>
        {mode === 'mexico' && (
          <div>
            <label htmlFor={`${idPrefix}-estado`}>Estado</label>
            <select
              id={`${idPrefix}-estado`}
              value={ESTADOS_MEXICO.includes(state) ? state : ''}
              onChange={(event) => onChange(event.target.value ? `${event.target.value}, México` : 'México')}
            >
              <option value="">Selecciona un estado</option>
              {ESTADOS_MEXICO.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        )}
        {mode === 'manual' && (
          <div>
            <label htmlFor={`${idPrefix}-otro`}>Localidad o ubicación</label>
            <input
              id={`${idPrefix}-otro`}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              maxLength={255}
              placeholder="Municipio, estado o país"
            />
          </div>
        )}
      </div>
    </fieldset>
  );
}
