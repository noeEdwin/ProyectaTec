import type { PerfilPublicoData } from '../types/perfil';

// Datos ficticios exclusivamente para maquetación. No representan cuentas reales.
export const perfilOrganizacionInicial: PerfilPublicoData = {
  id: 'org-demo',
  is_organization: true,
  name: 'Centro de Innovación Oaxaca',
  description: 'Conectamos ideas, proyectos y oportunidades.',
  location: 'Oaxaca, México',
  image: null,
  classification: 'Organización',
  contact: { email: 'contacto@ejemplo.com' },
  initiatives: [
    { id: 'cafe-demo', titulo: 'Monitoreo y secado solar de café', categoria: 'Colaboración', sector: 'Agroindustria', estado: 'En curso' },
    { id: 'mezcal-demo', titulo: 'Trazabilidad digital para mezcal', categoria: 'Colaboración', sector: 'Tecnología', estado: 'En revisión' },
  ],
};

export const perfilPersonaInicial: PerfilPublicoData = {
  id: 'persona-demo',
  is_organization: false,
  name: 'María Hernández',
  description: 'Estudiante interesada en innovación tecnológica y proyectos de impacto social.',
  location: 'Oaxaca, México',
  image: null,
  classification: 'Estudiante · Ingeniería en Sistemas',
  contact: { email: 'persona@ejemplo.com' },
  initiatives: [
    { id: 'tecnologia-demo', titulo: 'Tecnología para comunidades de Oaxaca', categoria: 'Colaboración', sector: 'Tecnología', estado: 'En curso' },
  ],
};
