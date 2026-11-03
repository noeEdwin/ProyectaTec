import { Link, useSearchParams } from 'react-router-dom';
import PerfilResumen from '../components/perfiles/PerfilResumen';
import { obtenerTipoPerfil } from '../context/perfil-context';
import { usePerfil } from '../context/perfil-context';
import '../styles/perfil.css';

export default function PerfilPublico() {
  const [busqueda] = useSearchParams();
  const tipo = obtenerTipoPerfil(busqueda.get('tipo'));
  const { perfiles } = usePerfil();
  const perfil = perfiles[tipo];

  return (
    <div className="perfil-page">
      <div className="perfil-contenedor">
        <div className="perfil-main">
          <div className="perfil-encabezado">
            <span className="perfil-etiqueta">PROYECTATEC / PERFIL PÚBLICO</span>
            <h1>Perfil público</h1>
            <p>Así se presenta tu cuenta a otras personas del ecosistema.</p>
          </div>
          <PerfilResumen key={perfil.id} perfil={perfil} />
          <section className="perfil-iniciativas">
            <h2>Iniciativas públicas</h2>
            {perfil.initiatives.length === 0 ? (
              <p className="perfil-sin-iniciativas">Todavía no hay iniciativas públicas disponibles.</p>
            ) : (
              <ul className="perfil-lista-iniciativas">
                {perfil.initiatives.map((item) => (
                  <li key={item.id} className="perfil-iniciativa">
                    <div className="perfil-iniciativa-info">
                      <h3>{item.titulo}</h3>
                      <p>{item.categoria} · {item.sector}</p>
                    </div>
                    <span className="perfil-estado">{item.estado}</span>
                    <Link className="perfil-ver-proyecto" to={`/iniciativas?q=${encodeURIComponent(item.titulo)}`}>Ver proyecto →</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <footer className="perfil-footer">
          <span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span>
          <span>Ayuda y privacidad</span>
        </footer>
      </div>
    </div>
  );
}
