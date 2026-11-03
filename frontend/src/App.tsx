
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

import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <Routes>
            {/* Autenticación */}
            <Route path="/acceso" element={<Acceso />} />
            <Route path="/registro" element={<Registro />} />

            <Route element={<MainLayout />}>
              <Route path="/" element={<Inicio />} />
              <Route path="/perfil-publico" element={<PerfilPublico />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/iniciativas" element={<Catalogo />} />
                <Route path="/catalogo" element={<Catalogo />} />

                {/* Perfil conectado a API del equipo */}
                <Route path="/perfil" element={<Perfil />} />

                {/* Vistas de demostración - Issue #50 */}
                <Route path="/mi-perfil" element={<MiPerfil />} />
                <Route path="/editar-perfil" element={<Navigate to="/perfil" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  );
}

export default App;
