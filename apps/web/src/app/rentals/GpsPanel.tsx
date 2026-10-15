import styles from './ActiveRentalScreen.module.css';

/**
 * ALQ-10 - panel de ubicacion GPS del vehiculo en alquiler.
 * Estados del prototipo `alerta_gps_no_disponible_br_alq_006`:
 *  - NOT_CONNECTED: el sistema aun no integra un proveedor GPS (sin dato; estado por defecto).
 *  - UNAVAILABLE: el GPS del vehiculo no reporta; muestra la alerta y la accion manual (BR-ALQ-010).
 * Cuando exista fuente de datos (Flota/proveedor) se pasara `status: 'AVAILABLE'` con la ultima posicion.
 */
export type GpsPanelStatus = 'NOT_CONNECTED' | 'UNAVAILABLE' | 'AVAILABLE';

export interface GpsPanelProps {
  status: GpsPanelStatus;
  plate: string;
  lastPosition?: { label: string; reportedAt: string } | null;
  onRegisterIncident?: () => void;
}

export function GpsPanel({ status, plate, lastPosition, onRegisterIncident }: GpsPanelProps) {
  return (
    <section className={styles.card} aria-labelledby="gps-title">
      <h2 id="gps-title" className={styles.cardTitle}>Ubicación GPS</h2>
      {status === 'NOT_CONNECTED' && (
        <p className={styles.notice} role="status">
          El seguimiento GPS aún no está conectado a este sistema. La ubicación de {plate} no se muestra.
        </p>
      )}
      {status === 'UNAVAILABLE' && (
        <div className={styles.alert} role="alert">
          <strong>GPS no disponible</strong> — {plate} no está reportando ubicación (BR-ALQ-010). Confirma con el cliente su
          posición y registra una incidencia si el equipo está desconectado.
          {onRegisterIncident && (
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={onRegisterIncident}>
                Registrar incidencia
              </button>
            </div>
          )}
        </div>
      )}
      {status === 'AVAILABLE' && lastPosition && (
        <p className={styles.notice} role="status">
          Última posición: {lastPosition.label} ({lastPosition.reportedAt})
        </p>
      )}
    </section>
  );
}
