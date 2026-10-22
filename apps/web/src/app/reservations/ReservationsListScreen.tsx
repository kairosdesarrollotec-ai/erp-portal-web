import { Link, useNavigate } from 'react-router-dom';
import { useReservationsList } from './useReservationsList';
import { RESERVATION_STATUS_LABELS, type ReservationStatus } from './reservation-status';
import { AppHeader } from '../shared/AppHeader';
import styles from './ReservationsListScreen.module.css';
import { formatLimaDate } from '../shared/lima-time';

/**
 * RES-01 - Bandeja de Reservas. Fuente: PANTALLAS-V3-B-RESERVA.md,
 * prototipo aprobado PROTO-RES-01-BANDEJA (READY, desktop). Estados:
 * READY, LOADING, EMPTY, RECOVERABLE_ERROR (contrato punto 9).
 */
export function ReservationsListScreen() {
  const { state, reservations, totalCount, context, filters, setFilters } = useReservationsList();
  const navigate = useNavigate();

  return (
    <main className={styles.wrapper}>
      <AppHeader
        pageTitle="Reservas"
        actions={
          <button
            type="button"
            className={styles.newButton}
            onClick={() => navigate('/consultas', { state: context ?? undefined })}
            title="Una reserva nace de una Consulta: elige la consulta cotizada y usa «Reservar este vehículo»."
          >
            Nueva reserva (desde Consulta)
          </button>
        }
      />

      <div className={styles.content}>
        <p className={styles.helperText}>
          Toda reserva nace de una Consulta. Para crear una, abre la consulta cotizada del cliente y reserva el vehículo.
        </p>

        {(state === 'READY' || state === 'EMPTY' || totalCount > 0) && (
          <div className={styles.filters}>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Buscar por cliente o vehículo"
              aria-label="Filtrar por cliente o vehículo"
              value={filters.query}
              onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            />
            <select
              className={styles.filterInput}
              aria-label="Filtrar por estado"
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value as ReservationStatus | '' })}
            >
              <option value="">Todos los estados</option>
              {(Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]).map((status) => (
                <option key={status} value={status}>
                  {RESERVATION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        )}

        {state === 'LOADING' && <p className={styles.statusText}>Cargando reservas…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>
            No pudimos cargar la bandeja de reservas. Intenta de nuevo en unos segundos.
          </p>
        )}

        {state === 'EMPTY' && <p className={styles.statusText}>Todavía no hay reservas registradas.</p>}

        {state === 'READY' && reservations.length === 0 && (
          <p className={styles.statusText}>Ninguna reserva coincide con los filtros.</p>
        )}

        {state === 'READY' && reservations.length > 0 && (
          <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Fechas</th>
                <th>Empresa</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr
                  key={reservation.id}
                  className={styles.row}
                  onClick={() =>
                    navigate(`/reservas/${reservation.id}`, {
                      state: context ?? undefined,
                    })
                  }
                >
                  <td data-label="Cliente">{reservation.customer.name}</td>
                  <td data-label="Vehículo">{reservation.vehicle.label}</td>
                  <td data-label="Fechas">
                    {formatLimaDate(reservation.startAt)} –{' '}
                    {formatLimaDate(reservation.endAt)}
                  </td>
                  <td data-label="Empresa">{context?.companyName ?? '—'}</td>
                  <td data-label="Estado">
                    <span className={`${styles.badge} ${styles[`badge_${reservation.status}`]}`}>
                      {RESERVATION_STATUS_LABELS[reservation.status]}
                    </span>
                    {reservation.status === 'DRAFT' && (
                      <Link
                        to={`/reservas/${reservation.id}`}
                        state={context ?? undefined}
                        className={styles.continueButton}
                        onClick={(event: React.MouseEvent) => event.stopPropagation()}
                      >
                        Continuar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </main>
  );
}
