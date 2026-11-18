import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import logoProyectatec from '../assets/logo-proyectatec.png';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout, isLoggingOut } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'US';
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].substring(0, 2).toUpperCase();
  };

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setIsMobileNavOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    closeAllMenus();
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(target)) {
        setIsMobileNavOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav
      ref={navRef}
      className="navbar"
      style={{ pointerEvents: isLoggingOut ? 'none' : 'auto', opacity: isLoggingOut ? 0.8 : 1 }}
    >
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={closeAllMenus}>
          <img src={logoProyectatec} alt="ProyectaTec" className="navbar-logo-img" />
          <span>ProyectaTec</span>
          <span className="brand-dot"></span>
        </Link>

        <div className="navbar-right-controls">
          <div className="navbar-actions">
            {user ? (
              <div className="user-dropdown-container" ref={menuRef}>
                <button
                  type="button"
                  className="user-dropdown-btn"
                  aria-expanded={isMenuOpen}
                  onClick={() => {
                    setIsMenuOpen((prev) => !prev);
                    setIsMobileNavOpen(false);
                  }}
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
                      onClick={closeAllMenus}
                      className="dropdown-item"
                    >
                      Mi Perfil
                    </Link>

                    <Link
                      to="/mis-publicaciones"
                      onClick={closeAllMenus}
                      className="dropdown-item"
                    >
                      Mis publicaciones
                    </Link>

                    <Link
                      to="/mi-perfil?tipo=organizacion"
                      onClick={closeAllMenus}
                      className="dropdown-item"
                    >
                      Mis organizaciones
                    </Link>

                    {user.can_manage_platform && (
                      <>
                        <Link
                          to="/admin/organizaciones"
                          onClick={closeAllMenus}
                          className="dropdown-item"
                        >
                          Revisar organizaciones
                        </Link>
                        <Link
                          to="/admin/moderacion"
                          onClick={closeAllMenus}
                          className="dropdown-item"
                        >
                          Moderación
                        </Link>
                      </>
                    )}

                    <hr className="dropdown-divider" />

                    <button
                      type="button"
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
                <NavLink to="/acceso" className="btn-acceso" onClick={closeAllMenus}>ACCESO</NavLink>
                <NavLink to="/registro" className="btn-registro" onClick={closeAllMenus}>REGISTRARSE</NavLink>
              </>
            )}
          </div>

          <button
            type="button"
            className="navbar-toggle"
            aria-label={isMobileNavOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={isMobileNavOpen}
            onClick={() => {
              setIsMobileNavOpen((prev) => !prev);
              setIsMenuOpen(false);
            }}
          >
            {isMobileNavOpen ? '✕' : '☰'}
          </button>
        </div>

        <div className={`navbar-menu ${isMobileNavOpen ? 'open' : ''}`}>
          <NavLink
            to="/"
            end
            onClick={closeAllMenus}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            Inicio
          </NavLink>
          <NavLink
            to="/iniciativas"
            onClick={closeAllMenus}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            Iniciativas
          </NavLink>
          <NavLink
            to="/organizaciones"
            onClick={closeAllMenus}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            Organizaciones
          </NavLink>
          {user && (
            <NavLink
              to="/mis-publicaciones"
              onClick={closeAllMenus}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              Mis publicaciones
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}
