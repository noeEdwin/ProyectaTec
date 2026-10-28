import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MainLayout from './layouts/MainLayout';

import Inicio from './pages/inicio';
import Registro from './pages/registro';
import Catalogo from './pages/catalogo';
import Acceso from './pages/acceso';

import './styles/App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/acceso" element={<Acceso />} />
        <Route path="/registro" element={<Registro />} />


        <Route element={<MainLayout />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/iniciativas" element={<Catalogo />} />
          
          <Route path="/catalogo" element={<Catalogo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;