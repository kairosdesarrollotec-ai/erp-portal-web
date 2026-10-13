import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { RESERVATION_STATUS_LABELS } from './reservation-status';
import type { ReservationDetailState } from './useReservationDetail';
import type { ReservationSummary } from './reservations-client';
import styles from './ReservationDetailScreen.module.css';

/** Marco común de RES-06/07/08: estados LOADING/ERROR, banner 412, resumen de solo lectura. */
export function ResolutionShell({
  state,
  reservation,
  title,
  reload,
  children,
}: {
  state: ReservationDetailState;
  reservation: ReservationSummary | null;
  title: string;
  reload: () => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  if (state === 'LOADING' && !reservation) {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText} role="status">Cargando reserva…</p>
      </main>
    );
  }
  if (state === 'RECOVERABLE_ERROR' || !reservation) {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>No pudimos cargar esta reserva. Vuelve a la bandeja e intenta de nuevo.</p>
        <button type="button" className={styles.linkButton} onClick={() => navigate('/reservas')}>
          Volver a la bandeja
        </button>
      </main>
    );
  }
  return (
    <main className={styles.wrapper}>
      <AppHeader
        actions={
          <button type="button" className={styles.linkButton} onClick={() => navigate(`/reservas/${reservation.id}`)}>
            Volver a la reserva
          </button>
        }
      />
      <div className={styles.content}>
        {state === 'SYNC_CONFLICT' && (
          <div className={styles.conflictBanner} role="alert">
            Esta reserva cambió por otra operación mientras la veías.{' '}
            <button type="button" className={styles.linkButton} onClick={() => void reload()}>
              Recargar
            </button>
          </div>
        )}
        <div className={styles.summaryPanel}>
          <p className={styles.vehicleLabel}>{reservation.vehicle.label}</p>
          <dl className={styles.summaryList}>
            <div>
              <dt>Cliente</dt>
              <dd>{reservation.customer.name}</dd>
            </div>
            <div>
              <dt>Fechas</dt>
              <dd>
                {new Date(reservation.startAt).toLocaleDateString('es-PE')} –{' '}
                {new Date(reservation.endAt).toLocaleDateString('es-PE')}
              </dd>
            </div>
            <div>
              <dt>Monto de reserva</dt>
              <dd>S/ {reservation.requiredPayment.amount}</dd>
            </div>
          </dl>
        </div>
        <section className={styles.mainPanel} aria-labelledby="resolution-title">
          <h1 id="resolution-title" className={styles.vehicleLabel}>{title}</h1>
          <span className={`${styles.badge} ${reservation.status === 'CONFIRMED' ? styles.badgeConfirmed : styles.badgeDraft}`}>
            {RESERVATION_STATUS_LABELS[reservation.status]}
          </span>
          {children}
        </section>
      </div>
    </main>
  );
}
