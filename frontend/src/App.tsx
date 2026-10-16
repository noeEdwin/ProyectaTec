import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Inicio from './pages/inicio';
import Registro from './pages/registro';
import Catalogo from './pages/catalogo';
import './styles/App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/catalogo" element={<Catalogo />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;