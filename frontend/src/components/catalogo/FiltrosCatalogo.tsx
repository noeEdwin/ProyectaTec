
import { useState, type FormEvent } from 'react';
import type { Categoria } from '../../types/publicacion';
import { SECTORES } from '../../utils/camposPerfil';

type Props = {
  busqueda: string;
  categoriaId: string;
  sector: string;
  categorias: Categoria[];
  onBuscar: (texto: string, sector: string) => void;
  onCategoriaId: (id: string) => void;
  onLimpiar: () => void;
};

export default function FiltrosCatalogo({
  busqueda,
  categoriaId,
  sector,
  categorias,
  onBuscar,
  onCategoriaId,
  onLimpiar,
}: Props) {
  const [texto, setTexto] = useState(busqueda);
  const [sectorSeleccionado, setSectorSeleccionado] = useState(sector);

  const hayFiltrosAplicados =
    busqueda.trim() !== '' ||
    categoriaId !== '' ||
    sector.trim() !== '';

  const hayCambiosSinAplicar =
    texto !== busqueda ||
    sectorSeleccionado !== sector;

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onBuscar(texto.trim(), sectorSeleccionado);
  }

  function limpiar() {
    setTexto('');
    setSectorSeleccionado('');
    onLimpiar();
  }

  // Los botones utilizan categorías reales, nunca nombres inventados.
  const categoriasRapidas = categorias.slice(0, 6);

  const estiloBoton = (activo: boolean) => ({
    border: activo ? '1px solid #0f4c5c' : '1px solid #e2e8f0',
    background: activo ? '#0f4c5c' : '#fff',
    color: activo ? '#fff' : '#64748b',
    padding: '9px 18px',
    borderRadius: 25,
    cursor: 'pointer',
  });

  const estiloSelector = {
    padding: 11,
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    background: '#fff',
    color: '#111827',
    width: '100%',
  };

  return (
    <div className="catalogo-controles">
      <form onSubmit={buscar} role="search">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 8px 7px 17px',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
          }}
        >
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
            onChange={(evento) => setTexto(evento.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outlineOffset: 3,
              padding: '10px 0',
              color: '#111827',
            }}
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
            }}
          >
            Buscar
          </button>
        </div>

        <div
          className="catalogo-filtros"
          role="group"
          aria-label="Filtros rápidos por categoría"
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

          {categoriasRapidas.map((categoria) => {
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
            gap: 16,
            marginTop: 20,
          }}
        >
          <label
            htmlFor="catalogo-categoria"
            style={{
              display: 'grid',
              gap: 6,
              flex: '1 1 220px',
            }}
          >
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Categoría
            </span>

            <select
              id="catalogo-categoria"
              value={categoriaId}
              onChange={(evento) =>
                onCategoriaId(evento.target.value)
              }
              style={estiloSelector}
            >
              <option value="">Todas las categorías</option>

              {categorias.map((categoria) => (
                <option
                  key={categoria.id}
                  value={String(categoria.id)}
                >
                  {categoria.name}
                </option>
              ))}
            </select>
          </label>

          <label
            htmlFor="catalogo-sector"
            style={{
              display: 'grid',
              gap: 6,
              flex: '1 1 220px',
            }}
          >
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Sector de organización
            </span>

            <select
              id="catalogo-sector"
              value={sectorSeleccionado}
              onChange={(evento) =>
                setSectorSeleccionado(evento.target.value)
              }
              style={estiloSelector}
            >
              <option value="">Todos los sectores</option>

              {sector &&
                !SECTORES.some((opcion) => opcion === sector) && (
                  <option value={sector}>{sector}</option>
                )}

              {SECTORES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>

            <small style={{ color: '#64748b' }}>
              Se aplica a proyectos de organizaciones.
              Pulsa Buscar para aplicar el sector.
            </small>
          </label>

          <button
            type="button"
            onClick={limpiar}
            disabled={
              !hayFiltrosAplicados &&
              !hayCambiosSinAplicar &&
              texto.trim() === '' &&
              sectorSeleccionado === ''
            }
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 25,
              background: '#fff',
              color: '#0f4c5c',
              padding: '11px 18px',
              cursor: 'pointer',
              opacity:
                hayFiltrosAplicados ||
                hayCambiosSinAplicar ||
                texto.trim() !== '' ||
                sectorSeleccionado !== ''
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
