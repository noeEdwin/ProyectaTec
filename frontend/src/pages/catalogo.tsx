
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

import {
  buscarPublicaciones,
  listarCategorias,
} from '../api/publicacionesService';

import { adaptarIniciativa } from '../types/iniciativa';
import type { Iniciativa } from '../types/iniciativa';
import type { Categoria } from '../types/publicacion';

import IniciativaCard from '../components/catalogo/IniciativaCard';
import EstadoCatalogo from '../components/catalogo/EstadoCatalogo';
import FiltrosCatalogo from '../components/catalogo/FiltrosCatalogo';

import '../styles/catalogo.css';
import '../styles/catalogoComponentes.css';

type CambiosFiltros = {
  q?: string;
  category_id?: string;
  sector?: string;
};

type EstadoBusqueda = {
  clave: string;
  iniciativas: Iniciativa[];
  total: number;
  error: boolean;
  mensajeError: string | null;
};

export default function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtros aplicados desde la URL
  const qParam = searchParams.get('q') ?? '';
  const categoryIdParam =
    Number(searchParams.get('category_id') ?? '') || 0;
  const sectorParam = searchParams.get('sector') ?? '';

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [errorCategorias, setErrorCategorias] = useState(false);

  const [estadoBusqueda, setEstadoBusqueda] =
    useState<EstadoBusqueda | null>(null);

  const [intento, setIntento] = useState(0);

  // Identifica la combinación de filtros y el intento de consulta.
  // Permite reconocer si los resultados pertenecen a la URL actual.
  const consultaClave = JSON.stringify([
    qParam,
    categoryIdParam,
    sectorParam,
    intento,
  ]);

  // Obtener las categorías reales desde Laravel
  useEffect(() => {
    let activo = true;

    void listarCategorias()
      .then((lista) => {
        if (!activo) return;

        setCategorias(lista);
        setErrorCategorias(false);
      })
      .catch(() => {
        if (!activo) return;

        setCategorias([]);
        setErrorCategorias(true);
      });

    return () => {
      activo = false;
    };
  }, []);

  // Consultar proyectos y necesidades utilizando filtros del servidor
  useEffect(() => {
    let activo = true;

    void buscarPublicaciones({
      q: qParam.trim() || undefined,
      category_id:
        categoryIdParam > 0 ? categoryIdParam : undefined,
      sector: sectorParam.trim() || undefined,
      page: 1,
    })
      .then((resultado) => {
        if (!activo) return;

        // Conservar el ordenamiento implementado por el equipo.
        const ordenadas = [...resultado.items].sort(
          (a, b) =>
            (b.created_at ?? '').localeCompare(a.created_at ?? '') ||
            b.id - a.id ||
            a.type.localeCompare(b.type),
        );

        setEstadoBusqueda({
          clave: consultaClave,
          iniciativas: ordenadas.map(adaptarIniciativa),
          total: resultado.meta.total,
          error: false,
          mensajeError: null,
        });
      })
      .catch((err: unknown) => {
        if (!activo) return;

        let mensajeError: string | null = null;

        // Conservar el manejo de validaciones del backend.
        if (
          axios.isAxiosError(err) &&
          err.response?.status === 422
        ) {
          const data = err.response.data as {
            message?: string;
            errors?: Record<string, string[]>;
          };

          const primerDetalle = data?.errors
            ? Object.values(data.errors).flat()[0]
            : undefined;

          mensajeError =
            primerDetalle ||
            data?.message ||
            'Los parámetros de búsqueda no son válidos.';
        }

        setEstadoBusqueda({
          clave: consultaClave,
          iniciativas: [],
          total: 0,
          error: true,
          mensajeError,
        });
      });

    return () => {
      activo = false;
    };
  }, [
    qParam,
    categoryIdParam,
    sectorParam,
    consultaClave,
  ]);

  // Solo utilizamos resultados correspondientes a los filtros actuales.
  // Esto evita mostrar datos anteriores mientras se consulta la API.
  const datosActuales =
    estadoBusqueda?.clave === consultaClave
      ? estadoBusqueda
      : null;

  const cargando = datosActuales === null;
  const error = datosActuales?.error ?? false;
  const mensajeError = datosActuales?.mensajeError ?? null;
  const iniciativas = datosActuales?.iniciativas ?? [];
  const totalDisponibles = datosActuales?.total ?? 0;

  // Mostrar las primeras seis iniciativas en el catálogo.
  const tarjetas = iniciativas.slice(0, 6);

  // Mantener los filtros existentes al actualizar solo uno de ellos.
  function actualizarFiltros(cambios: CambiosFiltros) {
    setSearchParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);

      Object.entries(cambios).forEach(([clave, valor]) => {
        const valorLimpio = valor?.trim() ?? '';

        if (
          valorLimpio === '' ||
          (clave === 'category_id' && valorLimpio === '0')
        ) {
          siguientes.delete(clave);
        } else {
          siguientes.set(clave, valorLimpio);
        }
      });

      // El catálogo actual utiliza IDs, no nombres de categorías.
      siguientes.delete('categoria');

      return siguientes;
    });
  }

  function limpiarFiltros() {
    setSearchParams({});
  }

  function reintentar() {
    setIntento((numero) => numero + 1);
  }

  // Conservar los filtros aplicados al navegar a Más iniciativas.
  const parametrosMas = new URLSearchParams();

  if (qParam.trim()) {
    parametrosMas.set('q', qParam.trim());
  }

  if (categoryIdParam > 0) {
    parametrosMas.set('category_id', String(categoryIdParam));
  }

  if (sectorParam.trim()) {
    parametrosMas.set('sector', sectorParam.trim());
  }

  const consultaMas = parametrosMas.toString();

  const urlMas = consultaMas
    ? `/iniciativas/mas?${consultaMas}`
    : '/iniciativas/mas';

  return (
    <main
      className="catalogo-page"
      style={{
        backgroundColor: '#fff',
        minHeight: 'calc(100vh - 80px)',
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      }}
    >
      <header style={{ marginBottom: 30 }}>
        <span className="mi-eyebrow">
          PROYECTATEC / OPORTUNIDADES
        </span>

        <div
          className="catalogo-heading"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 24,
          }}
        >
          <div>
            <h1
              style={{
                color: '#111827',
                margin: '0 0 5px',
                letterSpacing: '-.02em',
              }}
            >
              Iniciativas y residencias
            </h1>

            <p style={{ color: '#64748b', margin: 0 }}>
              Explora proyectos y oportunidades para colaborar
              en Oaxaca.
            </p>
          </div>

          <span
            aria-live="polite"
            style={{
              color: '#0f4c5c',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {cargando
              ? 'Cargando iniciativas…'
              : error
                ? 'No se pudo consultar el catálogo'
                : `${totalDisponibles} iniciativas disponibles`}
          </span>
        </div>
      </header>

      {/* Buscador y filtros reutilizables */}
      <section
        aria-label="Búsqueda y filtros"
        style={{ marginBottom: 38 }}
      >
        <FiltrosCatalogo
          key={qParam}
          busqueda={qParam}
          categoriaId={
            categoryIdParam > 0
              ? String(categoryIdParam)
              : ''
          }
          sector={sectorParam}
          categorias={categorias}
          onBuscar={(texto) =>
            actualizarFiltros({
              q: texto,
            })
          }
          onCategoriaId={(id) =>
            actualizarFiltros({
              category_id: id,
            })
          }
          onSector={(sector) =>
            actualizarFiltros({
              sector,
            })
          }
          onLimpiar={limpiarFiltros}
        />

        {errorCategorias && (
          <p
            role="status"
            style={{
              color: '#991b1b',
              fontSize: 13,
              marginTop: 12,
            }}
          >
            No se pudieron cargar las categorías disponibles.
          </p>
        )}
      </section>

      {/* Resultados */}
      <section aria-label="Iniciativas destacadas">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              color: '#111827',
              fontSize: 20,
              margin: 0,
            }}
          >
            Iniciativas destacadas
          </h2>

          <span
            style={{
              color: '#94a3b8',
              fontSize: 13,
            }}
          >
            Selecciona una iniciativa para conocer sus detalles
          </span>
        </div>

        {mensajeError && (
          <p
            role="alert"
            style={{
              color: '#dc2626',
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            {mensajeError}
          </p>
        )}

        <EstadoCatalogo
          cargando={cargando}
          error={error}
          vacio={
            !cargando &&
            !error &&
            tarjetas.length === 0
          }
          mensajeVacio="No se encontraron iniciativas con esos criterios."
          onReintentar={reintentar}
        />

        {!cargando && !error && tarjetas.length > 0 && (
          <div className="ic-cuadricula">
            {tarjetas.map((item) => (
              <IniciativaCard
                key={`${item.tipo}-${item.id}`}
                iniciativa={item}
              />
            ))}
          </div>
        )}
      </section>

      {/* Navegación hacia el resto de iniciativas */}
      <footer
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          marginTop: 44,
          borderTop: '1px solid #e2e8f0',
          paddingTop: 24,
        }}
      >
        <span
          style={{
            color: '#64748b',
            fontSize: 13,
          }}
        >
          Mostrando {tarjetas.length} de {totalDisponibles}{' '}
          iniciativas
        </span>

        {!cargando && !error && totalDisponibles > 6 && (
          <Link
            to={urlMas}
            style={{
              border: '1px solid #e2e8f0',
              color: '#0f4c5c',
              textDecoration: 'none',
              borderRadius: 24,
              padding: '11px 22px',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Ver más iniciativas{' '}
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </footer>
    </main>
  );
}
