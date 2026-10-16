import { Link, NavLink } from 'react-router-dom';
import '../styles/Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          ProyectaTec
          <span className="brand-dot"></span>
        </Link>

        <div className="navbar-menu">
          <Link to="/#ecosistema" className="nav-link">
            Ecosistema
          </Link>

          <Link to="/#como-funciona" className="nav-link">
            Cómo funciona
          </Link>

          <NavLink
            to="/iniciativas"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            Iniciativas
          </NavLink>
        </div>

        <div className="navbar-actions">
          <NavLink to="/acceso" className="btn-acceso">
            ACCESO
          </NavLink>

          <NavLink to="/registro" className="btn-registro">
            REGISTRARSE
          </NavLink>
        </div>
      </div>
    </nav>
  );
}