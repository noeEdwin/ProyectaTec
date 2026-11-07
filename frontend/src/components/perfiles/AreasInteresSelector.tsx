import '../../styles/camposPerfil.css';

const AREAS_INTERES = [
  'Tecnología e innovación',
  'Desarrollo de software',
  'Inteligencia artificial y datos',
  'Electrónica y robótica',
  'Telecomunicaciones',
  'Energías renovables',
  'Medio ambiente y sustentabilidad',
  'Agroindustria y alimentos',
  'Biotecnología',
  'Salud y bienestar',
  'Educación y formación',
  'Turismo y cultura',
  'Artesanías y diseño',
  'Manufactura e industria',
  'Construcción e infraestructura',
  'Logística y transporte',
  'Comercio y emprendimiento',
  'Finanzas y administración',
  'Desarrollo comunitario',
  'Ciencias sociales',
] as const;

const MAX_AREAS = 6;

type Props = {
  value: string[];
  onChange: (areas: string[]) => void;
  error?: string;
};

export default function AreasInteresSelector({ value, onChange, error }: Props) {
  return (
    <fieldset className="campos-perfil-grupo" aria-invalid={Boolean(error)}>
      <legend>Áreas de interés (opcional)</legend>
      <p>Elige hasta {MAX_AREAS} áreas. Son distintas de tu carrera o programa de estudios. {value.length}/{MAX_AREAS} seleccionadas.</p>
      <div className="campos-perfil-opciones">
        {AREAS_INTERES.map((area) => {
          const checked = value.includes(area);
          return (
            <label key={area} className="campos-perfil-opcion">
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && value.length >= MAX_AREAS}
                onChange={() => onChange(checked ? value.filter((item) => item !== area) : [...value, area])}
              />
              {area}
            </label>
          );
        })}
      </div>
      {error && <p className="campos-perfil-error" role="alert">{error}</p>}
    </fieldset>
  );
}
