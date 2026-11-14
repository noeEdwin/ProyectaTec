
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  buscarPublicaciones,
} from '../api/publicacionesService';

import type {
  PublicacionListado,
} from '../api/publicacionesService';

import { adaptarIniciativa } from '../types/iniciativa';

import IniciativaCard from '../components/catalogo/IniciativaCard';
import EstadoCatalogo from '../components/catalogo/EstadoCatalogo';

import '../styles/catalogoComponentes.css';

type EstadoListado = {
  clave: string;
  items: PublicacionListado[];
  pagina: number;
  ultimaPagina: number;
  total: number;
  error: boolean;
  cargandoMas: boolean;
  errorMas: boolean;
};

// Evita duplicados entre páginas y ordena los datos ya cargados.
function ordenarPublicaciones(
  items: PublicacionListado[],
): PublicacionListado[] {
  const unicas = new Map<string, PublicacionListado>();

  items.forEach((item) => {
    unicas.set(`${item.type}-${item.id}`, item);
  });

  return Array.from(unicas.values()).sort(
    (a, b) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? '') ||
      b.id - a.id ||
      a.type.localeCompare(b.type),
  );
}

export default function MasIniciativas() {
  const [parametros] = useSearchParams();

  const qParam = parametros.get('q') ?? '';
  const categoriaId =
    Number(parametros.get('category_id') ?? '') || 0;
  const sectorParam = parametros.get('sector') ?? '';

  const [estado, setEstado] = useState<EstadoListado | null>(
    null,
  );
  const [intento, setIntento] = useState(0);

  // Cada combinación de filtros representa una consulta distinta.
  const clave = JSON.stringify([
    qParam,
    categoriaId,
    sectorParam,
    intento,
  ]);

  // Obtener la primera página de ambos endpoints.
  useEffect(() => {
    let activo = true;

    void buscarPublicaciones({
      q: qParam.trim() || undefined,
      category_id:
        categoriaId > 0 ? categoriaId : undefined,
      sector: sectorParam.trim() || undefined,
      page: 1,
    })
      .then((resultado) => {
        if (!activo) return;

        setEstado({
          clave,
          items: ordenarPublicaciones(resultado.items),
          pagina: 1,
          ultimaPagina: resultado.meta.last_page,
          total: resultado.meta.total,
          error: false,
          cargandoMas: false,
          errorMas: false,
        });
      })
      .catch(() => {
        if (!activo) return;

        setEstado({
          clave,
          items: [],
          pagina: 1,
          ultimaPagina: 1,
          total: 0,
          error: true,
          cargandoMas: false,
          errorMas: false,
        });
      });

    return () => {
      activo = false;
    };
  }, [
    qParam,
    categoriaId,
    sectorParam,
    clave,
  ]);

  // Solo utilizar datos de la búsqueda actual.
  const datosActuales =
    estado?.clave === clave ? estado : null;

  const cargando = datosActuales === null;
  const error = datosActuales?.error ?? false;

  const items = datosActuales?.items ?? [];

  // Las primeras seis publicaciones corresponden
  // al catálogo principal.
  const visibles = items
    .slice(6)
    .map(adaptarIniciativa);

  const hayMasPaginas =
    datosActuales !== null &&
    !datosActuales.error &&
    datosActuales.pagina < datosActuales.ultimaPagina;

  const cargandoMas = datosActuales?.cargandoMas ?? false;
  const errorMas = datosActuales?.errorMas ?? false;

  const totalAdicionales = Math.max(
    0,
    (datosActuales?.total ?? 0) - 6,
  );

  function reintentar() {
    setIntento((numero) => numero + 1);
  }

  // Agregar resultados de la siguiente página.
  async function cargarMas() {
    if (
      !datosActuales ||
      !hayMasPaginas ||
      cargandoMas
    ) {
      return;
    }

    const paginaSiguiente = datosActuales.pagina + 1;

    setEstado((anterior) => {
      if (!anterior || anterior.clave !== clave) {
        return anterior;
      }

      return {
        ...anterior,
        cargandoMas: true,
        errorMas: false,
      };
    });

    try {
      const resultado = await buscarPublicaciones({
        q: qParam.trim() || undefined,
        category_id:
          categoriaId > 0 ? categoriaId : undefined,
        sector: sectorParam.trim() || undefined,
        page: paginaSiguiente,
      });

      setEstado((anterior) => {
        if (
          !anterior ||
          anterior.clave !== clave ||
          anterior.pagina !== paginaSiguiente - 1
        ) {
          return anterior;
        }

        return {
          ...anterior,
          items: ordenarPublicaciones([
            ...anterior.items,
            ...resultado.items,
          ]),
          pagina: paginaSiguiente,
          ultimaPagina: resultado.meta.last_page,
          total: resultado.meta.total,
          cargandoMas: false,
          errorMas: false,
        };
      });
    } catch {
      setEstado((anterior) => {
        if (!anterior || anterior.clave !== clave) {
          return anterior;
        }

        return {
          ...anterior,
          cargandoMas: false,
          errorMas: true,
        };
      });
    }
  }

  // Conservar los filtros al regresar al catálogo.
  const consultaVolver = new URLSearchParams();

  if (qParam.trim()) {
    consultaVolver.set('q', qParam.trim());
  }

  if (categoriaId > 0) {
    consultaVolver.set('category_id', String(categoriaId));
  }

  if (sectorParam.trim()) {
    consultaVolver.set('sector', sectorParam.trim());
  }

  const filtrosVolver = consultaVolver.toString();

  const urlVolver = filtrosVolver
    ? `/iniciativas?${filtrosVolver}`
    : '/iniciativas';

  return (
    <main className="mi-page">
      <div className="mi-contenido">
        <header>
          <span className="mi-eyebrow">
            PROYECTATEC / MÁS INICIATIVAS
          </span>

          <h1>Explorar más iniciativas</h1>

          <p className="mi-subtitulo">
            Descubre otros proyectos y posibilidades
            de colaboración.
          </p>
        </header>

        <section
          className="mi-panel"
          aria-label="Otras oportunidades"
        >
          <h2>Otras oportunidades</h2>

          {!cargando && !error && (
            <p
              aria-live="polite"
              style={{
                fontSize: 13,
                color: '#64748b',
                marginBottom: 20,
              }}
            >
              Mostrando {visibles.length} de{' '}
              {totalAdicionales} iniciativas adicionales
            </p>
          )}

          <EstadoCatalogo
            cargando={cargando}
            error={error}
            vacio={
              !cargando &&
              !error &&
              visibles.length === 0
            }
            mensajeVacio={
              'Por ahora no hay más iniciativas disponibles con los filtros seleccionados.'
            }
            onReintentar={reintentar}
          />

          {!cargando && !error && (
            <>
              {visibles.map((item) => (
                <IniciativaCard
                  key={`${item.tipo}-${item.id}`}
                  iniciativa={item}
                  variante="fila"
                />
              ))}

              {errorMas && (
                <p
                  role="alert"
                  style={{
                    color: '#991b1b',
                    marginTop: 20,
                  }}
                >
                  No se pudieron cargar más iniciativas.
                  Puedes intentarlo de nuevo.
                </p>
              )}

              {hayMasPaginas && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: 24,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void cargarMas()}
                    disabled={cargandoMas}
                    style={{
                      border: '1px solid #0f4c5c',
                      background: '#fff',
                      color: '#0f4c5c',
                      borderRadius: 24,
                      padding: '11px 22px',
                      fontWeight: 700,
                      cursor: cargandoMas
                        ? 'wait'
                        : 'pointer',
                    }}
                  >
                    {cargandoMas
                      ? 'Cargando más iniciativas…'
                      : errorMas
                        ? 'Reintentar cargar más'
                        : 'Cargar más iniciativas'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <div className="mi-volver">
          <Link to={urlVolver}>
            Volver al catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}
