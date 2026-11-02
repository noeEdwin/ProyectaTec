import { useState } from 'react';
import type { PerfilPublicoData } from '../../types/perfil';
import { inicialesPerfil } from '../../utils/perfil';


export default function PerfilResumen({ perfil }: { perfil: PerfilPublicoData }) {
  const [mostrarContacto, setMostrarContacto] = useState(false);
  const conContacto = Boolean(perfil.contact.email || perfil.contact.phone);

  return (
    <section className="perfil-resumen" aria-label={`Información pública de ${perfil.name}`}>
      <div className="perfil-resumen-principal">
        <div className="perfil-avatar">
          {perfil.image ? <img src={perfil.image} alt={`Imagen de ${perfil.name}`} /> : <span aria-hidden="true">{inicialesPerfil(perfil.name)}</span>}
        </div>
        <div className="perfil-resumen-info">
          <h2>{perfil.name || 'Perfil sin nombre'}</h2>
          <p className="perfil-ubicacion">{perfil.location || 'Ubicación no indicada'} · {perfil.classification}</p>
          <p className="perfil-descripcion">{perfil.description || 'Sin descripción disponible.'}</p>
        </div>
      </div>
      <div className="perfil-contacto-container">
        <button type="button" className="perfil-contactar" onClick={() => setMostrarContacto((v) => !v)} aria-expanded={mostrarContacto} aria-controls="perfil-datos-contacto">
          Contactar
        </button>
        {mostrarContacto && (
          <div id="perfil-datos-contacto" className="perfil-contacto-detalles" role="status">
            {conContacto ? (
              <>
                {perfil.contact.email && <span>{perfil.contact.email}</span>}
                {perfil.contact.phone && <span>{perfil.contact.phone}</span>}
              </>
            ) : <span>No hay información de contacto.</span>}
          </div>
        )}
      </div>
    </section>
  );
}
