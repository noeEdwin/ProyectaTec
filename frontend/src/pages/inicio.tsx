import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import colaboracionImage from '../assets/inicio_sesion.png';
import '../styles/inicio.css';

// Tipos de TypeScript para la respuesta de Laravel
interface ProyectoDestacado {
  id: number;
  titulo: string;
  subtitulo: string;
  fase: string;
  estado: string;
  dias_restantes: number;
  imagen_url?: string;
}

interface Estadisticas {
  impacto: string;
  sectores: number;
}

function PanelVinculacion() {
  const [proyecto, setProyecto] = useState<ProyectoDestacado | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Consulta la iniciativa destacada desde Laravel
    api.get('/proyectos/destacado')
      .then((res) => {
        setProyecto(res.data);
      })
      .catch(() => {
        // Fallback local si el endpoint en Laravel aún no responde
        setProyecto({
          id: 1,
          titulo: 'AgroTech Oaxaca',
          subtitulo: 'Café de Especialidad Pluma',
          fase: 'Fase 01',
          estado: 'Activo',
          dias_restantes: 24,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  // Usa la imagen remota si Laravel la manda, o la local de assets si no
  const imagenMostrar = proyecto?.imagen_url || colaboracionImage;

  return (
    <aside className="inicio-panel" aria-label="Vinculación en Oaxaca">
      <span className="inicio-panel-line" aria-hidden="true" />
      <div className="inicio-panel-badge">
        <span className="inicio-panel-dot" aria-hidden="true" />
        TecNM Oaxaca
      </div>

      <div className="inicio-panel-photo">
        <img
          src={imagenMostrar}
          alt={proyecto ? proyecto.titulo : 'Estudiantes colaborando'}
        />
        <div className="inicio-panel-caption">
          <strong>DESARROLLO REGIONAL</strong>
          <span>Ingeniería + Identidad Cultural</span>
        </div>
      </div>

      <div className="inicio-panel-card">
        <div className="inicio-panel-card-heading">
          <span>Vinculación en Tiempo Real</span>
          <strong>3 Sectores en Sincronía</strong>
        </div>

        {loading ? (
          <div style={{ padding: '1rem', color: '#888' }}>Cargando proyecto...</div>
        ) : (
          <Link
            to={proyecto ? `/iniciativas/${proyecto.id}` : '/iniciativas'}
            className="inicio-panel-project"
          >
            <span className="inicio-panel-project-icon" aria-hidden="true">✦</span>
            <span className="inicio-panel-project-name">
              <strong>{proyecto?.titulo}</strong>
              <span>{proyecto?.subtitulo}</span>
            </span>
            <span className="inicio-panel-project-status">
              <span>{proyecto?.fase}</span>
              <strong>{proyecto?.estado}</strong>
            </span>
            <span className="inicio-panel-project-days">
              {proyecto?.dias_restantes} días
            </span>
          </Link>
        )}
      </div>

      <a className="inicio-panel-scroll" href="#buscar-vinculacion">
        SCROLL <span aria-hidden="true" />
      </a>
    </aside>
  );
}

function BuscadorVinculacion() {
  const [busqueda, setBusqueda] = useState('');
  const navigate = useNavigate();

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const termino = busqueda.trim();
    navigate(termino ? `/iniciativas?q=${encodeURIComponent(termino)}` : '/iniciativas');
  }

  return (
    <form className="inicio-search" id="buscar-vinculacion" onSubmit={buscar} role="search">
      <label className="inicio-search-field" htmlFor="inicio-busqueda">
        <svg aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="inicio-sr-only">Buscar proyectos por sector o especialidad</span>
        <input
          id="inicio-busqueda"
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por sector (Agroindustria, IA, Turismo, Textil) o especialidad..."
        />
      </label>
      <button type="submit">Buscar Vinculación</button>
    </form>
  );
}

export default function Inicio() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Estadisticas>({ impacto: '100%', sectores: 3 });

  useEffect(() => {
    // Carga estadísticas globales desde el backend
    api.get('/estadisticas/inicio')
      .then(res => setStats(res.data))
      .catch(() => {}); // Si falla, mantiene el estado inicial
  }, []);

  return (
    <div className="inicio-page">
      <div className="inicio-container">
        <div className="inicio-hero">
          <section className="inicio-intro" aria-labelledby="inicio-titulo">
            <p className="inicio-eyebrow">TECNM / INSTITUTO TECNOLÓGICO DE OAXACA</p>
            <h1 id="inicio-titulo">Talento, Industria<br />y Oaxaca.</h1>
            <p className="inicio-description">
              Conectando la triple hélice tecnológica regional: residencias de excelencia,
              innovación empresarial e impacto territorial medible.
            </p>

            <div className="inicio-actions">
              <div className="inicio-impact">
                <span>INICIATIVAS 2026</span>
                <strong>{stats.impacto} <small>IMPACTO</small></strong>
              </div>

              {/* Botón dinámico según el estado de la sesión */}
              {user ? (
                <Link to="/catalogo" className="inicio-explore">
                  <span aria-hidden="true">✦</span> Ir a Mi Panel
                </Link>
              ) : (
                <Link to="/iniciativas" className="inicio-explore">
                  <span aria-hidden="true">+</span> Explorar Proyectos
                </Link>
              )}
            </div>

            <div className="inicio-academic">
              <span className="inicio-academic-seal" aria-hidden="true">ITO</span>
              <div>
                <span>RESPALDO ACADÉMICO</span>
                <strong>TecNM ITO · SCG-1009 Software</strong>
              </div>
            </div>
          </section>

          <PanelVinculacion />
        </div>

        <BuscadorVinculacion />
      </div>
    </div>
  );
}