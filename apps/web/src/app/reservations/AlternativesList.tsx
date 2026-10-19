import type { FleetVehicle } from '../fleet/fleet-client';
import type { AlternativesState } from './useAlternativeVehicles';
import styles from './ReservationResolution.module.css';
import detail from './ReservationDetailScreen.module.css';

function vehicleLabel(v: FleetVehicle): string {
  return `${v.brand} ${v.model} - ${v.plate}`;
}

/** Lista de alternativas (radio group accesible) con estados LOADING/EMPTY/ERROR. */
export function AlternativesList({
  state,
  vehicles,
  selectedId,
  onSelect,
  onRetry,
  legend,
}: {
  state: AlternativesState;
  vehicles: FleetVehicle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
  legend: string;
}) {
  if (state === 'LOADING') return <p className={detail.statusText} role="status">Buscando vehículos libres en las fechas de la reserva…</p>;
  if (state === 'ERROR') {
    return (
      <div role="alert">
        <p className={detail.errorText}>No pudimos consultar los vehículos disponibles.</p>
        <button type="button" className={detail.linkButton} onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }
  if (state === 'EMPTY') {
    return <p className={styles.noteBox}>No hay otros vehículos libres en las fechas de esta reserva.</p>;
  }
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className={styles.sectionTitle}>{legend}</legend>
      <ul className={styles.altList}>
        {vehicles.map((v) => (
          <li key={v.id} className={`${styles.altItem} ${selectedId === v.id ? styles.altItemSelected : ''}`}>
            <label className={styles.altLabel}>
              <input
                type="radio"
                name="alternative-vehicle"
                value={v.id}
                checked={selectedId === v.id}
                onChange={() => onSelect(v.id)}
              />{' '}
              {vehicleLabel(v)}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
