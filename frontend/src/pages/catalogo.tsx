import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { buscarPublicaciones, listarCategorias } from '../api/publicacionesService';
import { adaptarIniciativa } from '../types/iniciativa';
import type { Iniciativa } from '../types/iniciativa';
import type { Categoria } from '../types/publicacion';
import IniciativaCard from '../components/catalogo/IniciativaCard';
import EstadoCatalogo from '../components/catalogo/EstadoCatalogo';
import '../styles/catalogo.css';
import '../styles/catalogoComponentes.css';

export default function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam = searchParams.get('q') ?? '';
  const categoryIdParam = Number(searchParams.get('category_id') ?? '') || 0;

  const [texto, setTexto] = useState(qParam);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([]);
  const [totalDisponibles, setTotalDisponibles] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    setTexto(qParam);
  }, [qParam]);

  useEffect(() => {
    let activo = true;
    void listarCategorias()
      .then((lista) => {
        if (activo) setCategorias(lista);
      })
      .catch(() => {
        if (activo) setCategorias([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(false);
    setMensajeError(null);

    void buscarPublicaciones({
      q: qParam || undefined,
      category_id: categoryIdParam > 0 ? categoryIdParam : undefined,
      page: 1,
    })
      .then((resultado) => {
        if (!activo) return;
        const ordenadas = [...resultado.items].sort(
          (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id - a.id,
        );
        setIniciativas(ordenadas.map(adaptarIniciativa));
        setTotalDisponibles(resultado.meta.total);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setError(true);
        if (axios.isAxiosError(err) && err.response?.status === 422) {
          const data = err.response.data as { message?: string; errors?: Record<string, string[]> };
          const primerDetalle = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
          setMensajeError(primerDetalle || data?.message || 'Los parámetros de búsqueda no son válidos.');
        } else {
          setMensajeError(null);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [qParam, categoryIdParam, intento]);

  function actualizarFiltros(nuevos: { q?: string; category_id?: number }) {
    const next = new URLSearchParams();
    const qFinal = (nuevos.q !== undefined ? nuevos.q : texto).trim();
    const catFinal = nuevos.category_id !== undefined ? nuevos.category_id : categoryIdParam;

    if (qFinal) next.set('q', qFinal);
    if (catFinal > 0) next.set('category_id', String(catFinal));

    setSearchParams(next);
  }

  function reintentar() {
    setIntento((n) => n + 1);
  }

  const tarjetas = iniciativas.slice(0, 6);
  const categoriaNombre =
    categoryIdParam === 0
      ? 'Todos'
      : (categorias.find((c) => c.id === categoryIdParam)?.name ?? 'Todos');

  const urlMas = `/iniciativas/mas?${new URLSearchParams({
    q: texto.trim(),
    categoria: categoriaNombre,
    ...(categoryIdParam > 0 ? { category_id: String(categoryIdParam) } : {}),
  }).toString()}`;

  return (
    <main
      className="catalogo-page"
      style={{
        backgroundColor: '#fff',
        minHeight: 'calc(100vh - 80px)',
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      }}
    >
      <header style={{ marginBottom: '30px' }}>
        <span className="mi-eyebrow">PROYECTATEC / OPORTUNIDADES</span>
        <div
          className="catalogo-heading"
          style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}
        >
          <div>
            <h1 style={{ color: '#111827', margin: '0 0 5px', letterSpacing: '-.02em' }}>
              Iniciativas y residencias
            </h1>
            <p style={{ color: '#64748b', margin: 0 }}>
              Explora proyectos y oportunidades para colaborar en Oaxaca.
            </p>
          </div>
          <span style={{ color: '#0f4c5c', fontWeight: 600, fontSize: 13 }}>
            {cargando ? 'Cargando iniciativas…' : `${totalDisponibles} iniciativas disponibles`}
          </span>
        </div>
      </header>

      <section aria-label="Búsqueda y filtros" style={{ marginBottom: 38 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            actualizarFiltros({ q: texto });
          }}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '7px 8px 7px 17px',
          }}
        >
          <span aria-hidden="true" style={{ color: '#94a3b8' }}>
            ⌕
          </span>
          <input
            type="search"
            aria-label="Buscar iniciativas"
            placeholder="Buscar por sector, proyecto o tecnología…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
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
        </form>

        <div
          className="catalogo-filtros"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}
        >
          <button
            type="button"
            aria-pressed={categoryIdParam === 0}
            onClick={() => actualizarFiltros({ category_id: 0 })}
            style={{
              border: categoryIdParam === 0 ? '1px solid #0f4c5c' : '1px solid #e2e8f0',
              background: categoryIdParam === 0 ? '#0f4c5c' : '#fff',
              color: categoryIdParam === 0 ? '#fff' : '#64748b',
              padding: '9px 18px',
              borderRadius: 25,
              cursor: 'pointer',
            }}
          >
            Todos
          </button>

          {categorias.map((cat) => {
            const activa = categoryIdParam === cat.id;
            return (
              <button
                type="button"
                key={cat.id}
                aria-pressed={activa}
                onClick={() => actualizarFiltros({ category_id: cat.id })}
                style={{
                  border: activa ? '1px solid #0f4c5c' : '1px solid #e2e8f0',
                  background: activa ? '#0f4c5c' : '#fff',
                  color: activa ? '#fff' : '#64748b',
                  padding: '9px 18px',
                  borderRadius: 25,
                  cursor: 'pointer',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Proyectos destacados">
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
          <h2 style={{ color: '#111827', fontSize: 20, margin: 0 }}>Proyectos destacados</h2>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>
            Selecciona un proyecto para conocer sus detalles
          </span>
        </div>

        {mensajeError && (
          <p role="alert" style={{ color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
            {mensajeError}
          </p>
        )}

        <EstadoCatalogo
          cargando={cargando && tarjetas.length === 0}
          error={error}
          vacio={!cargando && !error && tarjetas.length === 0}
          mensajeVacio="No se encontraron iniciativas con esos criterios."
          onReintentar={reintentar}
        />

        {!error && tarjetas.length > 0 && (
          <div
            className="ic-cuadricula"
            style={{
              opacity: cargando ? 0.55 : 1,
              pointerEvents: cargando ? 'none' : 'auto',
              transition: 'opacity 150ms ease',
            }}
          >
            {tarjetas.map((item) => (
              <IniciativaCard key={`${item.tipo}-${item.id}`} iniciativa={item} />
            ))}
          </div>
        )}
      </section>

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
        <span style={{ color: '#64748b', fontSize: 13 }}>
          Mostrando {tarjetas.length} de {totalDisponibles} iniciativas
        </span>
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
          Ver más iniciativas <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </main>
  );
}