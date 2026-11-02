import { createContext, useContext } from 'react';
import type { PerfilPublicoData } from '../types/perfil';

export type TipoPerfil = 'organizacion' | 'persona';
export type PerfilesEstado = Record<TipoPerfil, PerfilPublicoData>;

export type PerfilContextValue = {
  perfiles: PerfilesEstado;
  guardarPerfil: (tipo: TipoPerfil, datos: PerfilPublicoData) => void;
};

export const PerfilContext = createContext<PerfilContextValue | null>(null);

export function usePerfil(): PerfilContextValue {
  const value = useContext(PerfilContext);
  if (!value) throw new Error('usePerfil requiere PerfilProvider');
  return value;
}

export function obtenerTipoPerfil(tipo: string | null): TipoPerfil {
  return tipo === 'persona' ? 'persona' : 'organizacion';
}

export function rutaPerfil(ruta: string, tipo: TipoPerfil): string {
  return `${ruta}?tipo=${tipo}`;
}
