type PasswordChecklistProps = {
  password: string;
  confirmation?: string;
  showConfirmationCheck?: boolean;
};

type Regla = {
  id: string;
  label: string;
  cumple: boolean;
  detalleFaltante: string;
};

export default function PasswordChecklist({
  password,
  confirmation = '',
  showConfirmationCheck = false,
}: PasswordChecklistProps) {
  const iniciado = password.length > 0;
  const reglas: Regla[] = [
    {
      id: 'len',
      label: 'Mínimo 8 caracteres',
      cumple: password.length >= 8,
      detalleFaltante: `te faltan ${Math.max(0, 8 - password.length)} carácter(es) (${password.length}/8)`,
    },
    {
      id: 'upper',
      label: 'Al menos una letra mayúscula (A–Z)',
      cumple: /[A-Z]/.test(password),
      detalleFaltante: 'agrega una mayúscula (ej. A, B, M)',
    },
    {
      id: 'lower',
      label: 'Al menos una letra minúscula (a–z)',
      cumple: /[a-z]/.test(password),
      detalleFaltante: 'agrega una minúscula (ej. a, b, m)',
    },
    {
      id: 'num',
      label: 'Al menos un número (0–9)',
      cumple: /\d/.test(password),
      detalleFaltante: 'agrega un dígito (0–9)',
    },
    {
      id: 'sym',
      label: 'Al menos un símbolo o carácter especial (! @ # $ % & *)',
      cumple: /[^A-Za-z0-9]/.test(password),
      detalleFaltante: 'agrega un símbolo (ej. ! @ # $ % & *)',
    },
  ];

  const faltantes = reglas.filter((r) => !r.cumple).length;
  const coincide = confirmation.length > 0 && password === confirmation;

  return (
    <div className="pwd-checklist" aria-live="polite">
      <p className="pwd-checklist-titulo">
        {!iniciado
          ? 'Requisitos mínimos de seguridad:'
          : faltantes === 0
            ? 'Contraseña segura: cumple todos los requisitos.'
            : `Aún falta ${faltantes === 1 ? '1 requisito' : `${faltantes} requisitos`} para que sea segura:`}
      </p>
      <ul>
        {reglas.map((regla) => {
          const estado = !iniciado ? 'neutro' : regla.cumple ? 'ok' : 'faltante';
          return (
            <li key={regla.id} className={`pwd-item ${estado}`}>
              <span className="pwd-icon" aria-hidden="true">
                {estado === 'ok' ? '✓' : estado === 'faltante' ? '✕' : '•'}
              </span>
              <span>
                {regla.label}
                {estado === 'faltante' && (
                  <span className="pwd-razon"> — {regla.detalleFaltante}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {showConfirmationCheck && confirmation.length > 0 && (
        <p className={`pwd-match ${coincide ? 'ok' : 'faltante'}`}>
          <span className="pwd-icon" aria-hidden="true">{coincide ? '✓' : '✕'}</span>
          {coincide
            ? 'Las contraseñas coinciden.'
            : 'Las contraseñas todavía no coinciden.'}
        </p>
      )}
    </div>
  );
}
