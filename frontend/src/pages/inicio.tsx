import { Link } from 'react-router-dom';
import heroImage from '../assets/panel.png'; 

export default function Inicio() {
  const colorPrincipal = '#111827';
  const colorNaranja = '#F59E0B';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 4rem', fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', marginBottom: '4rem', minHeight: '65vh' }}>
        
        {/* COLUMNA IZQUIERDA */}
        <div style={{ flex: '1', maxWidth: '580px', paddingTop: '2rem' }}>
          
          {/* Etiqueta superior */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <span style={{ width: '24px', height: '3px', backgroundColor: colorNaranja, borderRadius: '2px' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em' }}>TECNM / INSTITUTO TECNOLÓGICO DE OAXACA</span>
          </div>
          
          {/* Título principal */}
          <h1 style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1.05, margin: '0 0 1.5rem 0', color: colorPrincipal, letterSpacing: '-0.02em' }}>
            Talento, Industria<br />y Oaxaca.
          </h1>
          
          {/* Descripción */}
          <p style={{ fontSize: '1.1rem', color: '#64748b', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '90%' }}>
            Conectando la triple hélice tecnológica regional: residencias de excelencia, innovación empresarial e impacto territorial medible.
          </p>
          
          {/* Acciones (Porcentaje y Botón) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', marginBottom: '3.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>INICIATIVAS 2024</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <h2 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 800, color: colorPrincipal, lineHeight: 1 }}>100%</h2>
                <span style={{ fontSize: '0.75rem', color: colorPrincipal, fontWeight: 700, letterSpacing: '1px' }}>IMPACTO</span>
              </div>
            </div>
            
            <Link to="/catalogo" style={{ backgroundColor: colorPrincipal, color: 'white', padding: '0.6rem 1.5rem 0.6rem 0.6rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
              <div style={{ backgroundColor: colorNaranja, color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>+</div>
              Explorar Proyectos
            </Link>
          </div>

          {/* Respaldo Académico */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem', border: '1px solid #f1f5f9', borderRadius: '50px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${colorNaranja}`, display: 'flex', justifyContent: 'center', alignItems: 'center', color: colorNaranja, fontWeight: 700, fontSize: '0.75rem' }}>ITO</div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>RESPALDO ACADÉMICO</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: colorPrincipal }}>TecNMITO • SCG-1009 Software <span style={{ color: '#9ca3af', marginLeft: '4px' }}>&gt;</span></div>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA (Imagen real de Figma) */}
        <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <img 
            src={heroImage} 
            alt="ProyectaTec Oaxaca" 
            style={{ width: '100%', maxWidth: '600px', height: 'auto', borderRadius: '24px', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* BUSCADOR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', border: '1px solid #f1f5f9', padding: '0.5rem 0.5rem 0.5rem 1.5rem', borderRadius: '50px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <svg width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Buscar por sector (Agroindustria, IA, Turismo, Textil) o especialidad..." 
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#333' }}
          />
        </div>
        <Link to="/catalogo" style={{ backgroundColor: colorPrincipal, color: 'white', padding: '0.9rem 2rem', borderRadius: '40px', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', textDecoration: 'none', display: 'inline-block' }}>
          Buscar Vinculación
        </Link>
      </div>

    </div>
  );
}