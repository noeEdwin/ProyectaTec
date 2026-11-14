import { useState, type FormEvent } from 'react';
import type { Categoria } from '../../types/publicacion';
import { SECTORES } from '../../utils/camposPerfil';

type Props = {
  busqueda: string;
  categoriaId: string;
  sector: string;
  categorias: Categoria[];
  onBuscar: (texto: string) => void;
  onCategoriaId: (id: string) => void;
  onSector: (sector: string) => void;
  onLimpiar: () => void;
};

export default function FiltrosCatalogo({
  busqueda,
  categoriaId,
  sector,
  categorias,
  onBuscar,
  onCategoriaId,
  onSector,
  onLimpiar,
}: Props) {
  const [texto, setTexto] = useState(busqueda);

  const hayFiltrosAplicados =
    busqueda.trim() !== '' || categoriaId !== '' || sector.trim() !== '';

  const hayCambiosSinAplicar = texto.trim() !== busqueda.trim();

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onBuscar(texto.trim());
  }

  function cambiarTexto(valor: string) {
    setTexto(valor);
    if (valor.trim() === '' && busqueda.trim() !== '') {
      onBuscar('');
    }
  }

  function limpiar() {
    setTexto('');
    onLimpiar();
  }

  const estiloBoton = (activo: boolean) => ({
    border: activo ? '1px solid #0f4c5c' : '1px solid #e2e8f0',
    background: activo ? '#0f4c5c' : '#fff',
    color: activo ? '#fff' : '#64748b',
    padding: '9px 18px',
    borderRadius: 25,
    cursor: 'pointer',
    fontWeight: activo ? 600 : 500,
    fontSize: 13,
  });

  const estiloSelector = {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    background: '#fff',
    color: '#111827',
    width: '100%',
    fontSize: 13,
  };

  return (
    <div className="catalogo-controles">
      <form onSubmit={buscar} role="search">
        <div className="catalogo-buscador">
          <span aria-hidden="true" style={{ color: '#94a3b8' }}>
            ⌕
          </span>

          <input
            id="catalogo-busqueda"
            name="q"
            type="search"
            aria-label="Buscar iniciativas"
            placeholder="Buscar proyectos y necesidades por título o descripción..."
            value={texto}
            maxLength={255}
            onChange={(evento) => cambiarTexto(evento.target.value)}
          />

          <button
            type="submit"
            style={{
              background: '#111827',
              color: '#fff',
              border: 0,
              borderRadius: 25,
              padding: '10px 22px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Buscar
          </button>
        </div>

        <div
          className="catalogo-filtros"
          role="group"
          aria-label="Filtrar por categoría"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            type="button"
            aria-pressed={categoriaId === ''}
            onClick={() => onCategoriaId('')}
            style={estiloBoton(categoriaId === '')}
          >
            Todos
          </button>

          {categorias.map((categoria) => {
            const id = String(categoria.id);
            const seleccionado = categoriaId === id;

            return (
              <button
                key={categoria.id}
                type="button"
                aria-pressed={seleccionado}
                onClick={() => onCategoriaId(id)}
                style={estiloBoton(seleccionado)}
              >
                {categoria.name}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'end',
            gap: 14,
            marginTop: 18,
          }}
        >
          <label
            htmlFor="catalogo-sector"
            style={{
              display: 'grid',
              gap: 6,
              flex: '1 1 260px',
              maxWidth: 360,
            }}
          >
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Sector de organización (solo proyectos)
            </span>

            <select
              id="catalogo-sector"
              value={sector}
              onChange={(evento) => onSector(evento.target.value)}
              style={estiloSelector}
            >
              <option value="">Todos los sectores</option>

              {sector && !SECTORES.some((opcion) => opcion === sector) && (
                <option value={sector}>{sector}</option>
              )}

              {SECTORES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={limpiar}
            disabled={!hayFiltrosAplicados && !hayCambiosSinAplicar && texto.trim() === ''}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 25,
              background: '#fff',
              color: '#0f4c5c',
              padding: '10px 18px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              opacity:
                hayFiltrosAplicados || hayCambiosSinAplicar || texto.trim() !== ''
                  ? 1
                  : 0.5,
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </form>
    </div>
  );
}
