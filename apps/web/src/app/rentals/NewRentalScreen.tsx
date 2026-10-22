import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { useWorkContextForRentals } from './useWorkContextForRentals';
import { createRentalFromReservation, RentalCommandError } from './rentals-client';
import { describeRentalError } from './rental-errors';
import { convertInquiryToRental, getInquiry, InquiryCommandError } from '../inquiries/inquiries-client';
import { getFirebaseAuth } from '../providers/firebase';
import { formatLimaDayMonth, limaToday, toLimaDateOnly } from '../shared/lima-time';
import pageStyles from './NewRentalScreen.module.css';
import styles from './RentalStageForms.module.css';

interface NewRentalNavState {
  companyId?: string;
  companyName?: string;
  branchId?: string;
  branchName?: string;
  customerId?: string;
  customerName?: string;
  vehicleId?: string;
  vehicleLabel?: string;
  reservationId?: string;
  inquiryId?: string;
  planCode?: string;
  startAt?: string;
  expectedEndAt?: string;
}

/**
 * ALQ-02 - Inicio/Conversion. Decision 22-oct: la Consulta es el unico punto de entrada. Esta pantalla solo se abre
 * con un origen valido: una Reserva confirmada (RES-05, "Continuar con alquiler", que ya hereda la consulta) o una
 * Consulta (`inquiryId`, que se convierte con `convert-to-rental`). Ya no existe el "alquiler directo" con
 * cliente + vehiculo sueltos. Errores de dominio: INQUIRY_REQUIRED / INQUIRY_CONVERSION_REQUIRED /
 * RESERVATION_START_NOT_REACHED / RESERVATION_START_DATE_PASSED (esta ultima sugiere el protocolo no-show).
 */
export function NewRentalScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { context } = useWorkContextForRentals();
  const navState = (location.state ?? {}) as NewRentalNavState;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const hasOrigin = Boolean(navState.reservationId || navState.inquiryId);
  const agreedDay = navState.reservationId && navState.startAt ? toLimaDateOnly(navState.startAt) : '';
  const beforeAgreedDate = Boolean(agreedDay) && limaToday() < agreedDay;

  async function handleCreate() {
    if (!context) return;
    setBusy(true);
    setError(null);
    setErrorCode(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();

      let rentalId: string;
      if (navState.reservationId) {
        const rental = await createRentalFromReservation(
          idToken,
          context.companyId,
          context.branchId,
          navState.reservationId,
          navState.planCode,
        );
        rentalId = rental.id;
      } else {
        const inquiry = await getInquiry(idToken, navState.inquiryId!, context.companyId, context.branchId);
        const result = await convertInquiryToRental(idToken, inquiry.id, inquiry.version, context.companyId, context.branchId);
        rentalId = result.rental.id;
      }

      navigate(`/alquileres/${rentalId}/entrega-01`, { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) {
        setErrorCode(err.problem?.code ?? null);
        setError(describeRentalError(err, err.message));
      } else if (err instanceof InquiryCommandError) {
        setErrorCode(err.problem?.code ?? null);
        setError(err.message);
      } else setError('No pudimos crear el expediente de alquiler.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <AppHeader pageTitle="Nuevo alquiler" />
      <div className={pageStyles.content}>
      <div className={styles.summaryCard}>
        {hasOrigin ? (
          <>
            <p className={styles.summaryLine}>
              <strong>Origen:</strong> {navState.reservationId ? 'Reserva confirmada' : 'Consulta'}
            </p>
            <p className={styles.summaryLine}>
              <strong>Cliente:</strong> {navState.customerName ?? '(heredado del origen)'}
            </p>
            <p className={styles.summaryLine}>
              <strong>Vehículo:</strong> {navState.vehicleLabel ?? '(heredado del origen)'}
            </p>
          </>
        ) : (
          <>
            <p className={styles.summaryLine}>
              Todo alquiler nace de una Consulta. Esta pantalla se abre desde la Consulta (o desde una Reserva confirmada
              que viene de una consulta) — no encontramos el origen esperado.
            </p>
            <p className={styles.summaryLine}>
              <Link to="/consultas" state={context ?? undefined}>
                Ir a Consultas
              </Link>
            </p>
          </>
        )}
      </div>
      {beforeAgreedDate && (
        <p className={styles.fieldHint} role="status" data-testid="agreed-date-notice">
          Disponible el día pactado: {formatLimaDayMonth(navState.startAt)}
        </p>
      )}
      {error && (
        <p className={styles.blockedNotice} role="alert">
          {error}
          {errorCode === 'RESERVATION_START_DATE_PASSED' && navState.reservationId && (
            <>
              {' '}
              <Link to={`/reservas/${navState.reservationId}/no-show`} state={context ?? undefined}>
                Ir al protocolo de no-show
              </Link>
            </>
          )}
        </p>
      )}
      <button
        type="button"
        className={styles.retryButton}
        disabled={!hasOrigin || !context || busy || beforeAgreedDate}
        onClick={handleCreate}
      >
        {busy ? 'Creando…' : 'Crear expediente'}
      </button>
      </div>
    </main>
  );
}
