import { useEffect } from 'react';
import './toast.css';

export type ToastMessage = {
  tipo: 'exito' | 'error';
  texto: string;
};

type ToastProps = {
  toast: ToastMessage | null;
  onClose: () => void;
  durationMs?: number;
};

export default function Toast({ toast, onClose, durationMs = 4500 }: ToastProps) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, onClose, durationMs]);

  if (!toast) return null;

  return (
    <div
      className={`pt-toast ${toast.tipo === 'exito' ? 'pt-toast-exito' : 'pt-toast-error'}`}
      role={toast.tipo === 'exito' ? 'status' : 'alert'}
      aria-live="polite"
    >
      <span className="pt-toast-texto">{toast.texto}</span>
      <button
        type="button"
        className="pt-toast-cerrar"
        onClick={onClose}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
}
