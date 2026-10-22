import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { HrFrame } from './HrFrame';
import { listFieldTrips, type FieldTrip } from './hr-client';
import { FIELD_TRIP_STATUS_LABEL, pendingLevel } from './hr-domain';
import { formatDateTime } from './hr-format';
import { useHrPermissions } from './hr-permissions';
import { useHrResource } from './useHrResource';
import type { HrWorkContext } from './useWorkContextForHr';
import styles from './HrFlow.module.css';

interface RowsProps {
  trips: FieldTrip[];
  label: string;
  context: HrWorkContext | null;
  action: (trip: FieldTrip) => { path: string; text: string } | null;
}

function TripRows({ trips, label, context, action }: RowsProps) {
  const headingId = `trips-${label.replace(/\W+/g, '-')}`;
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.sectionTitle}>
        {label}
      </h2>
      {trips.length === 0 ? (
        <p className={styles.hint}>No hay salidas en esta lista.</p>
      ) : (
        <ul className={styles.plainList}>
          {trips.map((trip) => {
            const link = action(trip);
            return (
              <li key={trip.id} className={styles.listItem}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.entryText}>
                      <strong>{trip.employeeName ?? 'Persona'}</strong> · {trip.destination}
                    </p>
                    <p className={styles.entryMeta}>
                      {FIELD_TRIP_STATUS_LABEL[trip.status]} · retorno previsto {formatDateTime(trip.estimatedReturn)}
                    </p>
                  </div>
                  {link && (
                    <Link className={styles.smallButton} to={link.path} state={context ?? undefined} aria-label={`${link.text}: ${trip.employeeName ?? 'salida'} a ${trip.destination}`}>
                      {link.text}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Salidas a campo: por autorizar (ADP-07), en campo esperando el regreso (ADP-08) y cerradas. */
function FieldTripsList() {
  const { can } = useHrPermissions();
  const { state, data, context } = useHrResource<FieldTrip[]>((token, scope) => listFieldTrips(token, scope), 'list');
  // Deep link de las notificaciones de Gerencia (`/personal/campo?tripId=...`): abre directo la solicitud.
  const [searchParams] = useSearchParams();
  const requestedTripId = searchParams.get('tripId');
  const requestedTrip = requestedTripId ? (data ?? []).find((t) => t.id === requestedTripId) : undefined;
  if (requestedTrip) {
    const needsReturn = requestedTrip.status === 'AUTORIZADA' && can('EVALUATE_FIELD_TRIP_RETURN');
    const closedWithReturn = pendingLevel(requestedTrip.status) === null && requestedTrip.status !== 'AUTORIZADA' && requestedTrip.status !== 'NO_AUTORIZADA';
    const page = needsReturn || closedWithReturn ? 'regreso' : 'autorizacion';
    return <Navigate replace to={`/personal/campo/${requestedTrip.id}/${page}`} state={context ?? undefined} />;
  }
  const trips = [...(data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = trips.filter((t) => pendingLevel(t.status) !== null);
  const out = trips.filter((t) => t.status === 'AUTORIZADA');
  const done = trips.filter((t) => pendingLevel(t.status) === null && t.status !== 'AUTORIZADA');

  return (
    <HrFrame pageTitle="Salidas a campo" back={{ label: 'Volver a Personal', to: '/personal' }} context={context} state={state} hasData={!!data} subject="las salidas a campo" wide>
      {data && trips.length === 0 && <p className={styles.statusText}>Todavía no hay solicitudes de salida a campo.</p>}
      {data && trips.length > 0 && (
        <>
          <TripRows trips={pending} label="Por autorizar" context={context} action={(t) => ({ path: `/personal/campo/${t.id}/autorizacion`, text: 'Abrir' })} />
          <TripRows
            trips={out}
            label="En campo, esperando el regreso"
            context={context}
            action={(t) => (can('EVALUATE_FIELD_TRIP_RETURN') ? { path: `/personal/campo/${t.id}/regreso`, text: 'Registrar regreso' } : { path: `/personal/campo/${t.id}/autorizacion`, text: 'Ver' })}
          />
          <TripRows trips={done} label="Cerradas o sin autorización" context={context} action={(t) => ({ path: `/personal/campo/${t.id}/${t.status === 'NO_AUTORIZADA' ? 'autorizacion' : 'regreso'}`, text: 'Ver' })} />
        </>
      )}
    </HrFrame>
  );
}

export function FieldTripsListScreen() {
  const { can } = useHrPermissions();
  if (!can('REQUEST_FIELD_TRIP') && !can('AUTHORIZE_FIELD_TRIP') && !can('EVALUATE_FIELD_TRIP_RETURN')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">
            No tienes acceso a las salidas a campo.
          </p>
        </div>
      </main>
    );
  }
  return <FieldTripsList />;
}
