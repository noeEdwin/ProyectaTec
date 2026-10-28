import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/acceso');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

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
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                Hola, {user.name}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="btn-acceso"
                style={{ cursor: 'pointer', background: 'transparent' }}
              >
                SALIR
              </button>
            </div>
          ) : (
            <>
              <NavLink to="/acceso" className="btn-acceso">
                ACCESO
              </NavLink>

              <NavLink to="/registro" className="btn-registro">
                REGISTRARSE
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}