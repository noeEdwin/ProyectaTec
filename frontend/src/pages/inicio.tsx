import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/auth-context';
import colaboracionImage from '../assets/inicio_sesion.png';
import '../styles/inicio.css';

interface ProyectoDestacado {
  id: number;
  titulo: string;
  subtitulo: string;
  fase: string;
  estado: string;
  dias_restantes: number;
  imagen_url?: string;
  tipo: 'project' | 'community_need';
}

interface Estadisticas {
  impacto: string;
  sectores: number;
}

function PanelVinculacion() {
  const [proyecto, setProyecto] = useState<ProyectoDestacado | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Consulta la lista de proyectos reales desde PostgreSQL a través de Laravel
    api.get('/api/projects')
      .then((res) => {
        const projects = Array.isArray(res.data?.projects)
          ? res.data.projects
          : Array.isArray(res.data)
          ? res.data
          : [];

        if (projects.length > 0) {
          const primero = projects[0];
          setProyecto({
            id: primero.id,
            titulo: primero.title,
            subtitulo: primero.organization?.name || primero.location || 'Iniciativa ProyectaTec',
            fase: 'Fase 01',
            estado: primero.status === 'open' ? 'Activo' : 'Activo',
            dias_restantes: 24,
            tipo: 'project',
          });
        } else {
          throw new Error('Sin proyectos');
        }
      })
      .catch(() => {
        // Fallback local si la base de datos está vacía o el servidor no responde
        setProyecto({
          id: 1,
          titulo: 'AgroTech Oaxaca',
          subtitulo: 'Café de Especialidad Pluma',
          fase: 'Fase 01',
          estado: 'Activo',
          dias_restantes: 24,
          tipo: 'project',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const imagenMostrar = proyecto?.imagen_url || colaboracionImage;

  return (
    <aside className="inicio-panel" aria-label="Vinculación en Oaxaca">
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
            to={proyecto ? `/iniciativas/${proyecto.tipo}/${proyecto.id}` : '/iniciativas'}
            className="inicio-panel-project"
          >
            <span className="inicio-panel-project-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21v-9" />
                <path d="M12 15c0-4 2.5-6.5 7-7-0.5 4.5-3 7-7 7Z" />
                <path d="M12 12c0-3.5-2-5.5-6-6 0.5 4 2.5 6 6 6Z" />
              </svg>
            </span>
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

      <div className="inicio-panel-scroll" aria-hidden="true">
        SCROLL <span aria-hidden="true" />
      </div>
    </aside>
  );
}

export default function Inicio() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Estadisticas>({ impacto: '100%', sectores: 3 });

  useEffect(() => {
    api.get('/estadisticas/inicio')
      .then(res => setStats(res.data))
      .catch(() => {});
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

              {/* Redirección al catálogo real /iniciativas */}
              {user ? (
                <Link to="/iniciativas" className="inicio-explore">
                  <span aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21v-9" />
                      <path d="M12 15c0-4 2.5-6.5 7-7-0.5 4.5-3 7-7 7Z" />
                      <path d="M12 12c0-3.5-2-5.5-6-6 0.5 4 2.5 6 6 6Z" />
                    </svg>
                  </span> Ir a las Iniciativas
                </Link>
              ) : (
                <Link to="/iniciativas" className="inicio-explore">
                  <span aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21v-9" />
                      <path d="M12 15c0-4 2.5-6.5 7-7-0.5 4.5-3 7-7 7Z" />
                      <path d="M12 12c0-3.5-2-5.5-6-6 0.5 4 2.5 6 6 6Z" />
                    </svg>
                  </span> Explorar Proyectos
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
      </div>
    </div>
  );
}