import { Link } from 'react-router-dom';
import { useReservationsList } from './useReservationsList';
import { RESERVATION_STATUS_LABELS } from './reservation-status';
import styles from './ReservationsListScreen.module.css';

/**
 * RES-01 - Bandeja de Reservas. Fuente: PANTALLAS-V3-B-RESERVA.md,
 * prototipo aprobado PROTO-RES-01-BANDEJA (READY, desktop). Estados:
 * READY, LOADING, EMPTY, RECOVERABLE_ERROR (contrato punto 9).
 *
 * Hallazgo de revision (finding #3): las filas ya no usan `<tr onClick>`
 * (inalcanzable por teclado y sin ningun rol semantico para un lector de
 * pantalla) - cada fila tiene un `<Link>` real "estirado" sobre toda la
 * fila (ver .rowLink en el CSS), navegable con Tab/Enter y con nombre
 * accesible propio.
 */
export function ReservationsListScreen() {
  const { state, reservations, context } = useReservationsList();

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.brand}>VeloxRent</span>
        <h1 className={styles.title}>Reservas</h1>
      </header>

      <div className={styles.content}>
        {state === 'LOADING' && <p className={styles.statusText}>Cargando reservas…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>
            No pudimos cargar la bandeja de reservas. Intenta de nuevo en unos segundos.
          </p>
        )}

        {state === 'EMPTY' && <p className={styles.statusText}>Todavía no hay reservas registradas.</p>}

        {state === 'READY' && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Fechas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id} className={styles.row}>
                  <td>
                    <Link
                      to={`/reservas/${reservation.id}`}
                      state={context ?? undefined}
                      className={styles.rowLink}
                      aria-label={`Ver detalle de la reserva de ${reservation.customer.name}`}
                    />
                    {reservation.customer.name}
                  </td>
                  <td>{reservation.vehicle.label}</td>
                  <td>
                    {new Date(reservation.startAt).toLocaleDateString('es-PE')} –{' '}
                    {new Date(reservation.endAt).toLocaleDateString('es-PE')}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles[`badge_${reservation.status}`]}`}>
                      {RESERVATION_STATUS_LABELS[reservation.status]}
                    </span>
                    {reservation.status === 'DRAFT' && (
                      <Link
                        to={`/reservas/${reservation.id}`}
                        state={context ?? undefined}
                        className={styles.continueButton}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Continuar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
