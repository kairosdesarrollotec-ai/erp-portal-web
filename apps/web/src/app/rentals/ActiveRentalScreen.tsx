import { EXTENSION_STATUS_LABELS, RENTAL_PLAN_LABELS } from './rental-status';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { usePermissions } from '../shared/usePermissions';
import { useRentalWizard } from './useRentalWizard';
import { RENTAL_STATUS_LABELS } from './rental-status';
import { formatPen } from './guarantee-breakdown';
import { GpsPanel } from './GpsPanel';
import { RequestExtensionModal } from './RequestExtensionModal';
import { SeriousBreachModal } from './SeriousBreachModal';
import { ExtensionDecisionPanel } from './ExtensionDecisionPanel';
import { RequestAirportServiceModal } from './RequestAirportServiceModal';
import { getRentalAirportService, type RentalAirportServiceResponse } from './rentals-client';
import styles from './ActiveRentalScreen.module.css';
import { formatLimaDateTime } from '../shared/lima-time';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return formatLimaDateTime(iso);
}

// N-06: el back no devuelve estado para el servicio de aeropuerto; se rotula "Solicitado" por defecto.
const AIRPORT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Solicitado',
  SCHEDULED: 'Programado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Realizado',
  CANCELLED: 'Cancelado',
};

/**
 * ALQ-10 - Alquiler activo. Resumen, garantia (con el traslado de la reserva), ampliaciones,
 * GPS y acciones: solicitar ampliacion (ALQ-11), registrar incidencia, iniciar devolucion y,
 * solo Gerencia, registrar falta grave (BR-ALQ-013) cuando hay una ampliacion pendiente.
 */
export function ActiveRentalScreen() {
  const { state, rental, context, reload, getIdToken } = useRentalWizard();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canReportBreach = can('RENTAL', 'REPORT_EXTENSION_BREACH');
  const canRequestAirport = can('RENTAL', 'REQUEST_AIRPORT_SERVICE');
  const [extOpen, setExtOpen] = useState(false);
  const [breachOpen, setBreachOpen] = useState(false);
  const [airportModalOpen, setAirportModalOpen] = useState(false);
  const [airportService, setAirportService] = useState<RentalAirportServiceResponse | null>(null);

  const rentalId = rental?.id;
  const companyId = context?.companyId;
  const branchId = context?.branchId;

  useEffect(() => {
    let cancelled = false;
    async function fetchAirport() {
      if (!rentalId || !companyId || !branchId) return;
      try {
        const idToken = await getIdToken();
        const res = await getRentalAirportService(idToken, rentalId, companyId, branchId);
        if (!cancelled) setAirportService(res);
      } catch {
        // ignore
      }
    }
    void fetchAirport();
    return () => {
      cancelled = true;
    };
  }, [rentalId, companyId, branchId, getIdToken]);

  if (state === 'LOADING') return <p className={styles.statusText}>Cargando alquiler…</p>;
  if (state === 'NOT_FOUND') return <p className={styles.statusText}>No encontramos este alquiler.</p>;
  if (state === 'RECOVERABLE_ERROR' || !rental || !context) {
    return <p className={styles.statusText}>No pudimos cargar el alquiler. Intenta de nuevo.</p>;
  }

  const isActive = rental.status === 'ACTIVE';
  const isExtensionPending = rental.status === 'EXTENSION_PENDING';
  const inProgress = isActive || isExtensionPending;
  const deposit = rental.deposit;
  // El back devuelve las ampliaciones con la más reciente primero (requestedAt desc).
  const lastExtension = rental.extensions && rental.extensions.length > 0 ? rental.extensions[0] : null;
  const incidentsPath = `/incidencias?rentalId=${rental.id}`;

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Alquiler activo" />
      <div className={styles.content}>
        {!inProgress && (
          <p className={styles.notice} role="status">
            Este alquiler está en estado «{RENTAL_STATUS_LABELS[rental.status]}» y ya no admite acciones de alquiler activo.
          </p>
        )}

        <section className={styles.card} aria-labelledby="alq10-resumen">
          <h2 id="alq10-resumen" className={styles.cardTitle}>
            {rental.vehicleBrand} {rental.vehicleModel} — {rental.vehiclePlate}{' '}
            <span className={styles.badge}>{isExtensionPending ? 'Ampliación pendiente' : RENTAL_STATUS_LABELS[rental.status]}</span>
          </h2>
          <dl className={styles.grid}>
            <div><dt>Cliente</dt><dd>{rental.customerName}</dd></div>
            <div><dt>Inicio</dt><dd>{formatDate(rental.startAt)}</dd></div>
            <div><dt>Devolución prevista</dt><dd>{formatDate(rental.expectedEndAt)}</dd></div>
            <div><dt>Plan</dt><dd>{RENTAL_PLAN_LABELS[rental.planCode] ?? rental.planCode}</dd></div>
          </dl>
        </section>

        <section className={styles.card} aria-labelledby="alq10-garantia">
          <h2 id="alq10-garantia" className={styles.cardTitle}>Garantía</h2>
          {deposit ? (
            <dl className={styles.grid} data-testid="active-guarantee">
              <div><dt>Garantía total</dt><dd>{formatPen(parseFloat(deposit.originalAmount))}</dd></div>
              <div>
                <dt>Reserva aplicada</dt>
                <dd>{formatPen(parseFloat(deposit.reservationCreditAmount ?? '0'))}</dd>
              </div>
              <div>
                <dt>Cobrado en la entrega</dt>
                <dd>{formatPen(parseFloat(deposit.amountCollected ?? deposit.originalAmount))}</dd>
              </div>
            </dl>
          ) : rental.depositRequired === false ? (
            <p className={styles.statusText} data-testid="no-deposit-company-driver">
              Sin garantía: con conductor de la empresa no se cobra garantía.
            </p>
          ) : (
            <p className={styles.statusText}>Sin garantía registrada.</p>
          )}
        </section>

        {lastExtension && (
          <section className={styles.card} aria-labelledby="alq10-ampliacion">
            <h2 id="alq10-ampliacion" className={styles.cardTitle}>Ampliación</h2>
            <p className={styles.statusText}>
              Estado: {EXTENSION_STATUS_LABELS[lastExtension.status] ?? lastExtension.status}
              {lastExtension.requestedEndAt ? ` — nueva devolución ${formatDate(lastExtension.requestedEndAt)}` : ''}
            </p>
            <ul>
              <li>Aviso con 12 h: {lastExtension.requirements.noticeGiven == null ? (lastExtension.requirements.authorized ? 'verificado al autorizar (el vencimiento cambió)' : 'sin dato') : lastExtension.requirements.noticeGiven ? 'cumplido' : 'no cumplido'}</li>
              <li>Autorización de Gerencia: {lastExtension.requirements.authorized ? 'cumplido' : 'pendiente'}</li>
              <li>Pago del periodo: {lastExtension.requirements.paid ? 'cumplido' : 'pendiente'}</li>
              <li>Adenda firmada: {lastExtension.requirements.addendumSigned ? 'cumplido' : 'pendiente'}</li>
            </ul>
          </section>
        )}

        {airportService && (
          <section className={styles.card} aria-labelledby="alq10-aeropuerto" data-testid="rental-airport-service-card">
            <h2 id="alq10-aeropuerto" className={styles.cardTitle}>Servicio de Aeropuerto</h2>
            <dl className={styles.grid}>
              <div><dt>Estado</dt><dd>{AIRPORT_STATUS_LABELS[airportService.status] ?? airportService.status ?? 'Solicitado'}</dd></div>
              <div><dt>Fecha y hora pactada</dt><dd>{formatDate(airportService.scheduledAt)}</dd></div>
              <div><dt>Lugar</dt><dd>{airportService.location}</dd></div>
              <div><dt>Monto adicional</dt><dd>{formatPen(parseFloat(airportService.additionalAmount))}</dd></div>
              {airportService.notes && <div><dt>Notas</dt><dd>{airportService.notes}</dd></div>}
            </dl>
          </section>
        )}

        {isExtensionPending && (
          <ExtensionDecisionPanel rental={rental} context={context} getIdToken={getIdToken} onDone={() => void reload()} />
        )}

        {inProgress && (
          <GpsPanel status="NOT_CONNECTED" plate={rental.vehiclePlate} onRegisterIncident={() => navigate(incidentsPath, { state: context })} />
        )}

        {inProgress && (
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => setExtOpen(true)} disabled={isExtensionPending}>
              Solicitar ampliación
            </button>
            {canRequestAirport && !airportService && (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setAirportModalOpen(true)}
                data-testid="request-rental-airport-btn"
              >
                Solicitar servicio de aeropuerto
              </button>
            )}
            <Link to={incidentsPath} state={context} className={styles.secondary}>
              Registrar incidencia
            </Link>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => navigate(`/devoluciones/recepcion/${rental.id}`, { state: context })}
            >
              Iniciar devolución
            </button>
            {isExtensionPending && canReportBreach && (
              <button type="button" className={styles.danger} onClick={() => setBreachOpen(true)}>
                Registrar falta grave
              </button>
            )}
          </div>
        )}
      </div>

      <RequestExtensionModal
        open={extOpen}
        rental={rental}
        companyId={context.companyId}
        branchId={context.branchId}
        onClose={() => setExtOpen(false)}
        onSuccess={() => {
          setExtOpen(false);
          void reload();
        }}
      />
      {breachOpen && (
        <SeriousBreachModal
          open
          rental={rental}
          companyId={context.companyId}
          branchId={context.branchId}
          onClose={() => setBreachOpen(false)}
          onSuccess={() => {
            setBreachOpen(false);
            void reload();
          }}
        />
      )}
      {airportModalOpen && (
        <RequestAirportServiceModal
          open
          rental={rental}
          companyId={context.companyId}
          branchId={context.branchId}
          onClose={() => setAirportModalOpen(false)}
          onSuccess={async () => {
            setAirportModalOpen(false);
            try {
              const idToken = await getIdToken();
              const res = await getRentalAirportService(idToken, rental.id, context.companyId, context.branchId);
              setAirportService(res);
            } catch {
              // ignore
            }
            void reload();
          }}
        />
      )}
     
    </main>
  );
}
