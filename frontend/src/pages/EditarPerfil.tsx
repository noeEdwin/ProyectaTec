import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { PerfilPublicoData } from '../types/perfil';
import { obtenerTipoPerfil, rutaPerfil, usePerfil } from '../context/perfil-context';
import type { TipoPerfil } from '../context/perfil-context';
import '../styles/perfilEspacio.css';

type CamposEdicion = {
  nombre: string;
  tipoCuenta: string;
  correo: string;
  descripcion: string;
  ubicacion: string;
};

type Errores = Partial<Record<keyof CamposEdicion, string>>;

function FormularioEdicion({ perfil, tipo }: { perfil: PerfilPublicoData; tipo: TipoPerfil }) {
  const navigate = useNavigate();
  const { guardarPerfil } = usePerfil();
  const [campos, setCampos] = useState<CamposEdicion>(() => ({
    nombre: perfil.name,
    tipoCuenta: perfil.classification,
    correo: perfil.contact.email || '',
    descripcion: perfil.description,
    ubicacion: perfil.location,
  }));
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  const opciones = tipo === 'organizacion'
    ? ['Organización', 'Empresa / MIPYME', 'Institución educativa', 'Sector social']
    : ['Estudiante · Ingeniería en Sistemas', 'Estudiante', 'Docente / asesor', 'Profesional'];
  if (!opciones.includes(campos.tipoCuenta) && campos.tipoCuenta) opciones.unshift(campos.tipoCuenta);

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
    else if (campos.nombre.trim().length > 255) nuevos.nombre = 'Máximo 255 caracteres.';
    if (!campos.tipoCuenta) nuevos.tipoCuenta = 'Selecciona el tipo de cuenta.';
    if (!campos.correo.trim()) nuevos.correo = 'Ingresa un correo de contacto.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.correo.trim())) nuevos.correo = 'Ingresa un correo válido.';
    if (campos.descripcion.length > 1000) nuevos.descripcion = 'Máximo 1000 caracteres.';
    if (campos.ubicacion.length > 255) nuevos.ubicacion = 'Máximo 255 caracteres.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    // Pausa corta solo para mostrar el estado visual de carga; no llama a ninguna API.
    setGuardando(true);
    setCargando(true);
    try {
      await new Promise<void>((resolver) => window.setTimeout(resolver, 350));
      guardarPerfil(tipo, {
        ...perfil,
        name: campos.nombre.trim(),
        classification: campos.tipoCuenta,
        description: campos.descripcion.trim(),
        location: campos.ubicacion.trim(),
        contact: { ...perfil.contact, email: campos.correo.trim() },
      });
      setExito('Cambios guardados en la demostración. No se enviaron a Laravel.');
    } catch {
      setErrores({ nombre: 'No se pudo actualizar el estado local. Intenta de nuevo.' });
    } finally {
      setGuardando(false);
      setCargando(false);
    }
  }

  return (
    <div className="pd-pagina">
      <div className="pd-contenedor">
        <header className="pd-encabezado"><span className="pd-eyebrow">PROYECTATEC / EDITAR PERFIL</span><h1>Editar perfil</h1><p>Actualiza los datos que verán otros participantes de ProyectaTec.</p></header>
        <p className="pd-nota-prototipo">Los cambios solo se conservan mientras la aplicación permanezca abierta.</p>
        <div className="pd-editar-grid">
          <section className="pd-tarjeta pd-form-card">
            <h2>Datos de tu perfil</h2>
            <form onSubmit={guardar} noValidate>
              <div className="pd-campo">
                <label htmlFor="pd-nombre">Nombre o razón social</label>
                <input id="pd-nombre" value={campos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? 'pd-nombre-error' : undefined} maxLength={256} placeholder="Tu nombre o el de tu organización" />
                {errores.nombre && <p className="pd-error" role="alert" id="pd-nombre-error">{errores.nombre}</p>}
              </div>
              <div className="pd-campo">
                <label htmlFor="pd-tipo">{tipo === 'organizacion' ? 'Tipo de cuenta' : 'Perfil o especialidad'}</label>
                <select id="pd-tipo" value={campos.tipoCuenta} onChange={(e) => cambiar('tipoCuenta', e.target.value)} aria-invalid={Boolean(errores.tipoCuenta)}>
                  <option value="">Selecciona una opción</option>
                  {opciones.map((opcion) => <option value={opcion} key={opcion}>{opcion}</option>)}
                </select>
                {errores.tipoCuenta && <p className="pd-error" role="alert">{errores.tipoCuenta}</p>}
              </div>
              <div className="pd-campo">
                <label htmlFor="pd-correo">Correo de contacto</label>
                <input id="pd-correo" type="email" value={campos.correo} onChange={(e) => cambiar('correo', e.target.value)} aria-invalid={Boolean(errores.correo)} placeholder="contacto@ejemplo.com" />
                {errores.correo && <p className="pd-error" role="alert">{errores.correo}</p>}
              </div>
              <div className="pd-campo">
                <label htmlFor="pd-descripcion">Descripción breve</label>
                <textarea id="pd-descripcion" rows={2} value={campos.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} aria-invalid={Boolean(errores.descripcion)} placeholder="Describe tu actividad e intereses" />
                {errores.descripcion && <p className="pd-error" role="alert">{errores.descripcion}</p>}
              </div>
              <div className="pd-campo">
                <label htmlFor="pd-ubicacion">Ubicación</label>
                <input id="pd-ubicacion" value={campos.ubicacion} onChange={(e) => cambiar('ubicacion', e.target.value)} aria-invalid={Boolean(errores.ubicacion)} placeholder="Oaxaca, México" />
                {errores.ubicacion && <p className="pd-error" role="alert">{errores.ubicacion}</p>}
              </div>
              {exito && <p className="pd-exito" role="status">{exito}</p>}
              <div className="pd-acciones">
                <button className="pd-boton-oscuro" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
                <button className="pd-boton-claro" type="button" disabled={guardando} onClick={() => navigate(rutaPerfil('/mi-perfil', tipo))}>Cancelar</button>
              </div>
            </form>
          </section>
          <aside className="pd-tarjeta pd-editar-aside">
            <h2>Vista pública</h2>
            <p>Esta información aparecerá en tu perfil público. La disposición es igual para todos los tipos de cuenta.</p>
            <Link to={rutaPerfil('/perfil-publico', tipo)} className="pd-boton-oscuro">Ver perfil público</Link>
            {cargando && <p className="pd-ayuda" role="status">Actualizando vista de demostración...</p>}
          </aside>
        </div>
        <footer className="pd-footer"><span>© 2026 ProyectaTec · Instituto Tecnológico de Oaxaca</span><span>Ayuda y privacidad</span></footer>
      </div>
    </div>
  );
}

export default function EditarPerfil() {
  const [busqueda] = useSearchParams();
  const tipo = obtenerTipoPerfil(busqueda.get('tipo'));
  const { perfiles } = usePerfil();
  const perfil = perfiles[tipo];
  if (!perfil) return <div className="pd-pagina"><p className="pd-vacio">No hay datos de perfil para mostrar.</p></div>;
  return <FormularioEdicion key={tipo} perfil={perfil} tipo={tipo} />;
}
