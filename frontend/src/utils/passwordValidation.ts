export const REQUISITOS_CONTRASENA = [
  'Al menos 8 caracteres',
  'Una letra mayúscula y una minúscula',
  'Al menos un número',
  'Al menos un símbolo (ej. !@#$%&*)',
];

export function validarContrasenaSegura(password: string): string | null {
  if (!password) {
    return 'Ingresa una contraseña.';
  }
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'Incluye al menos una letra mayúscula y una minúscula.';
  }
  if (!/\d/.test(password)) {
    return 'Incluye al menos un número.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Incluye al menos un símbolo especial (por ejemplo: ! @ # $ % & *).';
  }
  return null;
}
