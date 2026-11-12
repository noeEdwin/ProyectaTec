import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PerfilProvider } from './context/PerfilProvider';

import MainLayout from './layouts/MainLayout';

import Inicio from './pages/inicio';
import Registro from './pages/registro';
import Catalogo from './pages/catalogo';
import Acceso from './pages/acceso';
import Perfil from './pages/Perfil';

import MiPerfil from './pages/MiPerfil';
import PerfilPublico from './pages/perfilPublico';
import OrganizacionPublica from './pages/OrganizacionPublica';
import EditarPerfilOrganizacion from './pages/EditarPerfilOrganizacion';
import AdminOrganizaciones from './pages/AdminOrganizaciones';

import NuevaPublicacion from './pages/NuevaPublicacion';
import EditarPublicacion from './pages/EditarPublicacion';
import DetallePublicacion from './pages/DetallePublicacion';
import MisPublicaciones from './pages/MisPublicaciones';

import MasIniciativas from './pages/MasIniciativas';
import PublicacionesVinculaciones from './pages/PublicacionesVinculaciones';

import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas de autenticación sin layout */}
            <Route path="/acceso" element={<Acceso />} />
            <Route path="/registro" element={<Registro />} />

            {/* Layout Principal con Menú Superior (Navbar) */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Inicio />} />
              <Route path="/perfil-publico" element={<PerfilPublico />} />
              <Route path="/organizaciones/:id" element={<OrganizacionPublica />} />

              {/* Detalle de iniciativa: pública, con el menú de MainLayout */}
              <Route path="/iniciativas/:tipo/:id" element={<DetallePublicacion />} />
              <Route path="/publicaciones/:tipo/:id" element={<DetallePublicacion />} />

              {/* Rutas protegidas que requieren sesión activa */}
              <Route element={<ProtectedRoute />}>
                <Route path="/iniciativas" element={<Catalogo />} />
                <Route path="/catalogo" element={<Catalogo />} />

                {/* Perfil conectado a la API de Laravel */}
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/editar-perfil-organizacion" element={<EditarPerfilOrganizacion />} />
                <Route path="/admin/organizaciones" element={<AdminOrganizaciones />} />

                {/* Publicaciones: Crear y Editar */}
                <Route path="/publicaciones/nueva" element={<NuevaPublicacion />} />
                <Route path="/mis-publicaciones" element={<MisPublicaciones />} />
                <Route path="/publicaciones/:tipo/:id/editar" element={<EditarPublicacion />} />
                <Route path="/iniciativas/:tipo/:id/editar" element={<EditarPublicacion />} />

                {/* Vistas de demostración - Issue #50 */}
                <Route path="/mi-perfil" element={<MiPerfil />} />
                <Route path="/editar-perfil" element={<Navigate to="/perfil" replace />} />

                <Route path="/iniciativas/mas" element={<MasIniciativas />} />
                <Route path="/publicaciones" element={<PublicacionesVinculaciones />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  );
}

export default App;