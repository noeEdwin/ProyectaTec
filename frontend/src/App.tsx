import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import MainLayout from './layouts/MainLayout';

import Inicio from './pages/inicio';
import Registro from './pages/registro';
import Catalogo from './pages/catalogo';
import Acceso from './pages/acceso';

import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas de Autenticación */}
          <Route path="/acceso" element={<Acceso />} />
          <Route path="/registro" element={<Registro />} />

          {/* Layout Principal con Menú / Header */}
          <Route element={<MainLayout />}>
            {/* Página Principal Pública */}
            <Route path="/" element={<Inicio />} />

            {/* Rutas Privadas / Protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route path="/iniciativas" element={<Catalogo />} />
              <Route path="/catalogo" element={<Catalogo />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;