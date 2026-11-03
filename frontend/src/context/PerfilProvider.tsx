import { useState } from 'react';
import type { ReactNode } from 'react';
import { perfilOrganizacionInicial, perfilPersonaInicial } from '../data/perfilesIniciales';
import type { PerfilPublicoData } from '../types/perfil';
import { PerfilContext } from './perfil-context';
import type { PerfilesEstado, TipoPerfil } from './perfil-context';

// Estado únicamente en memoria. Recargar la pestaña restaura los ejemplos iniciales.
export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfiles, setPerfiles] = useState<PerfilesEstado>({
    organizacion: perfilOrganizacionInicial,
    persona: perfilPersonaInicial,
  });

  function guardarPerfil(tipo: TipoPerfil, datos: PerfilPublicoData) {
    setPerfiles((actuales) => ({ ...actuales, [tipo]: datos }));
  }

  return (
    <PerfilContext.Provider value={{ perfiles, guardarPerfil }}>
      {children}
    </PerfilContext.Provider>
  );
}
