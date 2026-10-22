import { useState } from 'react';
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
import styles from './ActiveRentalScreen.module.css';
import { formatLimaDateTime } from '../shared/lima-time';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return formatLimaDateTime(iso);
}

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
  const [extOpen, setExtOpen] = useState(false);
  const [breachOpen, setBreachOpen] = useState(false);

  if (state === 'LOADING') return <p className={styles.statusText}>Cargando alquiler…</p>;
  if (state === 'NOT_FOUND') return <p className={styles.statusText}>No encontramos este alquiler.</p>;
  if (state === 'RECOVERABLE_ERROR' || !rental || !context) {
    return <p className={styles.statusText}>No pudimos cargar el alquiler. Intenta de nuevo.</p>;
  }

  const isActive = rental.status === 'ACTIVE';
  const isExtensionPending = rental.status === 'EXTENSION_PENDING';
  const inProgress = isActive || isExtensionPending;
  const deposit = rental.deposit;
  const lastExtension = rental.extensions && rental.extensions.length > 0 ? rental.extensions[rental.extensions.length - 1] : null;
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
            <div><dt>Plan</dt><dd>{rental.planCode}</dd></div>
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
              Estado: {lastExtension.status}
              {lastExtension.requestedEndAt ? ` — nueva devolución ${formatDate(lastExtension.requestedEndAt)}` : ''}
            </p>
            <ul>
              <li>Aviso con 12 h: {lastExtension.requirements.noticeGiven == null ? 'sin dato' : lastExtension.requirements.noticeGiven ? 'cumplido' : 'no cumplido'}</li>
              <li>Autorización de Gerencia: {lastExtension.requirements.authorized ? 'cumplido' : 'pendiente'}</li>
              <li>Pago del periodo: {lastExtension.requirements.paid ? 'cumplido' : 'pendiente'}</li>
              <li>Adenda firmada: {lastExtension.requirements.addendumSigned ? 'cumplido' : 'pendiente'}</li>
            </ul>
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
     
    </main>
  );
}
