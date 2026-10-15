import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RentalResponse } from '../rentals/rentals-client';
import type { ReturnsWorkContext } from './useWorkContextForReturns';
import { scheduleReturn } from './returns-client';
import { describeReturnError } from './return-errors';
import { getFirebaseAuth } from '../providers/firebase';
import { useIncidentPermissions } from '../incidents/incident-permissions';
import styles from './ReturnsListScreen.module.css';
import { formatLimaDateTime, limaDateTimeToInstant } from '../shared/lima-time';

interface Props {
  rentals: RentalResponse[];
  context: ReturnsWorkContext | null;
  canCreate: boolean;
  canReceive: boolean;
  /** Ids de alquiler que ya tienen una devolucion en la bandeja. */
  rentalIdsWithReturn: ReadonlySet<string>;
  onScheduled: () => void;
}

/**
 * DEV-01 / DEV-02 - alquileres activos listos para devolver. "Iniciar
 * devolucion" desde el alquiler es 1 accion (presupuesto de interaccion
 * PANTALLAS-V3-B-DEVOLUCION.md); "Programar" registra la hora pactada
 * (POST /returns, estado PROGRAMADA).
 */
export function ActiveRentalsPanel({ rentals, context, canCreate, canReceive, rentalIdsWithReturn, onScheduled }: Props) {
  const { can: canIncident } = useIncidentPermissions();
  const [scheduling, setScheduling] = useState<RentalResponse | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = rentals.filter((r) => !rentalIdsWithReturn.has(r.id));
  if (candidates.length === 0) return null;

  async function handleSchedule() {
    if (!scheduling || !context || !scheduledAt) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      await scheduleReturn(idToken, context.companyId, context.branchId, scheduling.id, limaDateTimeToInstant(scheduledAt) ?? scheduledAt);
      setScheduling(null);
      setScheduledAt('');
      onScheduled();
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos programar la devolución. Intenta de nuevo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="active-rentals-title">
      <h2 id="active-rentals-title" className={styles.sectionTitle}>
        Alquileres activos
      </h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Fin pactado</th>
              <th><span className={styles.srOnly}>Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((rental) => (
              <tr key={rental.id}>
                <td data-label="Cliente">{rental.customerName}</td>
                <td data-label="Vehículo">
                  {rental.vehicleBrand} {rental.vehicleModel} - {rental.vehiclePlate}
                </td>
                <td data-label="Fin pactado">
                  {rental.expectedEndAt ? formatLimaDateTime(rental.expectedEndAt) : '—'}
                </td>
                <td>
                  {canReceive && (
                    <Link
                      to={`/devoluciones/recepcion/${rental.id}`}
                      state={context ?? undefined}
                      className={styles.continueButton}
                      aria-label={`Iniciar devolución de ${rental.vehiclePlate}`}
                    >
                      Iniciar devolución
                    </Link>
                  )}
                  {canIncident('VIEW') && (
                    <Link
                      to={`/incidencias?rentalId=${rental.id}`}
                      state={context ?? undefined}
                      className={styles.secondaryButton}
                      aria-label={`Ver o registrar incidencias de ${rental.vehiclePlate}`}
                    >
                      Incidencias
                    </Link>
                  )}
                  {canCreate && (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => setScheduling(rental)}
                      aria-label={`Programar devolución de ${rental.vehiclePlate}`}
                    >
                      Programar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scheduling && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="schedule-title">
          <div className={styles.modalCard}>
            <p id="schedule-title" className={styles.modalTitle}>
              Programar devolución — {scheduling.vehiclePlate}
            </p>
            <label className={styles.fieldLabel}>
              Fecha y hora pactada
              <input
                type="datetime-local"
                className={styles.input}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </label>
            {error && (
              <p className={styles.errorText} role="alert">
                {error}
              </p>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setScheduling(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.continueButton}
                disabled={!scheduledAt || busy}
                onClick={handleSchedule}
              >
                {busy ? 'Guardando…' : 'Programar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
