import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import colaboracionImage from '../assets/inicio_sesion.png';
import '../styles/inicio.css';

function PanelVinculacion() {
  return (
    <aside className="inicio-panel" aria-label="Vinculación en Oaxaca">
      <span className="inicio-panel-line" aria-hidden="true" />
      <div className="inicio-panel-badge">
        <span className="inicio-panel-dot" aria-hidden="true" />
        TecNM Oaxaca
      </div>

      <div className="inicio-panel-photo">
        <img
          src={colaboracionImage}
          alt="Estudiantes colaborando en un proyecto tecnológico en Oaxaca"
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
        <Link to="/iniciativas?q=caf%C3%A9" className="inicio-panel-project">
          <span className="inicio-panel-project-icon" aria-hidden="true">✦</span>
          <span className="inicio-panel-project-name">
            <strong>AgroTech Oaxaca</strong>
            <span>Café de Especialidad Pluma</span>
          </span>
          <span className="inicio-panel-project-status">
            <span>Fase 01</span>
            <strong>Activo</strong>
          </span>
          <span className="inicio-panel-project-days">24 días</span>
        </Link>
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
                <span>INICIATIVAS 2024</span>
                <strong>100% <small>IMPACTO</small></strong>
              </div>
              <Link to="/iniciativas" className="inicio-explore">
                <span aria-hidden="true">+</span> Explorar Proyectos
              </Link>
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
