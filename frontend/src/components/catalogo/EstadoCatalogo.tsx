import '../../styles/catalogoComponentes.css';

type Props = {
  cargando: boolean;
  error: boolean;
  vacio: boolean;
  mensajeVacio?: string;
  onReintentar?: () => void;
};

export default function EstadoCatalogo({ cargando, error, vacio, mensajeVacio, onReintentar }: Props) {
  if (cargando) return <p className="ic-mensaje" role="status">Cargando iniciativas…</p>;
  if (error) return (
    <div className="ic-mensaje ic-mensaje-error" role="alert">
      <p>No se pudieron cargar las iniciativas. Comprueba la conexión e inténtalo de nuevo.</p>
      {onReintentar && <button type="button" onClick={onReintentar}>Reintentar</button>}
    </div>
  );
  if (vacio) return <p className="ic-mensaje" role="status">{mensajeVacio ?? 'No hay iniciativas disponibles.'}</p>;
  return null;
}
