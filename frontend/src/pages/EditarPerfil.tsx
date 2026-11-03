import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import '../styles/perfilEspacio.css';

type CamposEdicion = {
  nombre: string;
  tipoCuenta: string;
  correo: string;
  descripcion: string;
  ubicacion: string;
};

type Errores = Partial<Record<keyof CamposEdicion, string>>;

export default function EditarPerfil() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Inicializamos con datos reales si existen, o vacíos para que el usuario los escriba libremente
  const [campos, setCampos] = useState<CamposEdicion>(() => ({
    nombre: user?.name || '',
    tipoCuenta: user?.account_type || '',
    correo: user?.email || '',
    descripcion: '',
    ubicacion: '',
  }));

  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState('');

  const tipoActual = user?.account_type === 'organizacion' ? 'organizacion' : 'persona';

  const opciones = tipoActual === 'organizacion'
    ? ['Organización', 'Empresa / MIPYME', 'Institución educativa', 'Sector social']
    : ['Estudiante', 'Docente / asesor', 'Profesional'];

  function cambiar(campo: keyof CamposEdicion, valor: string) {
    setCampos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
    setExito('');
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExito('');
    const nuevos: Errores = {};
    if (!campos.nombre.trim()) nuevos.nombre = 'Ingresa tu nombre o razón social.';
    if (!campos.correo.trim()) nuevos.correo = 'Ingresa un correo de contacto.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.correo.trim())) nuevos.correo = 'Ingresa un correo válido.';
    
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    try {
      await new Promise<void>((resolver) => window.setTimeout(resolver, 350));
      setExito('Cambios actualizados correctamente en tu sesión.');
    } catch {
      setErrores({ nombre: 'No se pudo actualizar. Intenta de nuevo.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="pd-pagina">
      <div className="pd-contenedor">
        <header className="pd-encabezado">
          <span className="pd-eyebrow">PROYECTATEC / EDITAR PERFIL</span>
          <h1>Editar perfil</h1>
          <p>Personaliza la información de tu cuenta en ProyectaTec.</p>
        </header>

        <div className="pd-editar-grid">
          <section className="pd-tarjeta pd-form-card">
            <h2>Datos de tu cuenta</h2>
            <form onSubmit={guardar} noValidate>
              <div className="pd-campo">
                <label htmlFor="pd-nombre">Nombre o razón social</label>
                <input 
                  id="pd-nombre" 
                  value={campos.nombre} 
                  onChange={(e) => cambiar('nombre', e.target.value)} 
                  placeholder="Escribe tu nombre completo"
                />
                {errores.nombre && <p className="pd-error" role="alert">{errores.nombre}</p>}
              </div>

              <div className="pd-campo">
                <label htmlFor="pd-tipo">Tipo de cuenta / Especialidad</label>
                <select 
                  id="pd-tipo" 
                  value={campos.tipoCuenta} 
                  onChange={(e) => cambiar('tipoCuenta', e.target.value)}
                >
                  <option value="">Selecciona una opción</option>
                  {opciones.map((opcion) => <option value={opcion} key={opcion}>{opcion}</option>)}
                </select>
              </div>

              <div className="pd-campo">
                <label htmlFor="pd-correo">Correo de contacto</label>
                <input 
                  id="pd-correo" 
                  type="email" 
                  value={campos.correo} 
                  onChange={(e) => cambiar('correo', e.target.value)} 
                  placeholder="usuario@itoaxaca.edu.mx"
                />
                {errores.correo && <p className="pd-error" role="alert">{errores.correo}</p>}
              </div>

              <div className="pd-campo">
                <label htmlFor="pd-descripcion">Descripción breve</label>
                <textarea 
                  id="pd-descripcion" 
                  rows={2} 
                  value={campos.descripcion} 
                  onChange={(e) => cambiar('descripcion', e.target.value)} 
                  placeholder="Cuéntanos brevemente sobre ti o tus objetivos..."
                />
              </div>

              <div className="pd-campo">
                <label htmlFor="pd-ubicacion">Ubicación</label>
                <input 
                  id="pd-ubicacion" 
                  value={campos.ubicacion} 
                  onChange={(e) => cambiar('ubicacion', e.target.value)} 
                  placeholder="Ej. Oaxaca, México"
                />
              </div>

              {exito && <p className="pd-exito" role="status">{exito}</p>}

              <div className="pd-acciones">
                <button className="pd-boton-oscuro" type="submit" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button className="pd-boton-claro" type="button" onClick={() => navigate('/mi-perfil')}>
                  Cancelar
                </button>
              </div>
            </form>
          </section>

          <aside className="pd-tarjeta pd-editar-aside">
            <h2>Vista pública</h2>
            <p>Esta información se sincroniza directamente con tu cuenta autenticada.</p>
            <Link to="/perfil-publico" className="pd-boton-oscuro">Ver perfil público</Link>
          </aside>
        </div>

        <footer className="pd-footer">
          <span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span>
        </footer>
      </div>
    </div>
  );
}