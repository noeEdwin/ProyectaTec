import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'US';
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsMenuOpen(false);
    try {
      await logout();
      navigate('/acceso');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar" style={{ pointerEvents: isLoggingOut ? 'none' : 'auto', opacity: isLoggingOut ? 0.8 : 1 }}>
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          ProyectaTec
          <span className="brand-dot"></span>
        </Link>

        <div className="navbar-menu">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Inicio
          </NavLink>
          <NavLink to="/iniciativas" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Iniciativas
          </NavLink>
          {user && <NavLink to="/mis-publicaciones" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Mis publicaciones</NavLink>}
        </div>

        <div className="navbar-actions">
          {user ? (
            <div className="user-dropdown-container" ref={menuRef}>
              <button 
                className="user-dropdown-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                disabled={isLoggingOut}
              >
                <div className="user-avatar">
                  {getInitials(user.name)}
                </div>
                <span className="user-dropdown-text">
                  Cuenta <span className="dropdown-icon">▼</span>
                </span>
              </button>

              {isMenuOpen && (
                <div className="user-dropdown-menu">
                  <Link 
                    to={['organizacion', 'organization', 'empresa', 'institucion_educativa', 'sector_social'].includes(user.account_type)
                      ? '/mi-perfil?tipo=organizacion'
                      : '/mi-perfil?tipo=persona'}
                    onClick={() => setIsMenuOpen(false)}
                    className="dropdown-item"
                  >
                    Mi Perfil
                  </Link>

                  <Link
                    to="/mis-publicaciones"
                    onClick={() => setIsMenuOpen(false)}
                    className="dropdown-item"
                  >
                    Mis publicaciones
                  </Link>

                  <Link
                    to="/mi-perfil?tipo=organizacion"
                    onClick={() => setIsMenuOpen(false)}
                    className="dropdown-item"
                  >
                    Mis organizaciones
                  </Link>

                  {user.can_manage_platform && (
                    <Link
                      to="/admin/organizaciones"
                      onClick={() => setIsMenuOpen(false)}
                      className="dropdown-item"
                    >
                      Revisar organizaciones
                    </Link>
                  )}
                  
                  <hr className="dropdown-divider" />
                  
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="dropdown-item danger"
                  >
                    {isLoggingOut ? 'Saliendo...' : 'Salir'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink to="/acceso" className="btn-acceso">ACCESO</NavLink>
              <NavLink to="/registro" className="btn-registro">REGISTRARSE</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}