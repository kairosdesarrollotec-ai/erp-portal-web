import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { useWorkContextForRentals } from './useWorkContextForRentals';
import { createRental, createRentalFromReservation, RentalCommandError } from './rentals-client';
import { getFirebaseAuth } from '../providers/firebase';
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
 * ALQ-02 - Inicio/Conversion. Entrada desde Consulta (CON-04) o Reserva
 * (RES-05, "Continuar con alquiler") via location.state: hereda cliente,
 * vehiculo, periodo y garantia sin volver a pedirlos. "Crear expediente"
 * llama a POST /rentals o /rentals/from-reservation/:id segun el origen.
 */
export function NewRentalScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { context } = useWorkContextForRentals();
  const navState = (location.state ?? {}) as NewRentalNavState;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOrigin = Boolean(navState.reservationId || (navState.customerId && navState.vehicleId));

  async function handleCreate() {
    if (!context) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();

      const rental = navState.reservationId
        ? await createRentalFromReservation(idToken, context.companyId, context.branchId, navState.reservationId, navState.planCode)
        : await createRental(idToken, context.companyId, context.branchId, navState.customerId!, navState.vehicleId!, {
            planCode: navState.planCode,
            startAt: navState.startAt,
            expectedEndAt: navState.expectedEndAt,
            inquiryId: navState.inquiryId,
          });

      navigate(`/alquileres/${rental.id}/entrega-01`, { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) setError(err.message);
      else setError('No pudimos crear el expediente de alquiler.');
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
              <strong>Cliente:</strong> {navState.customerName ?? '(heredado de la reserva)'}
            </p>
            <p className={styles.summaryLine}>
              <strong>Vehículo:</strong> {navState.vehicleLabel ?? '(heredado de la reserva)'}
            </p>
          </>
        ) : (
          <p className={styles.summaryLine}>
            Esta pantalla se abre desde una Consulta o Reserva ya calificada — no encontramos el origen esperado.
          </p>
        )}
      </div>
      {error && <p className={styles.blockedNotice}>{error}</p>}
      <button type="button" className={styles.retryButton} disabled={!hasOrigin || !context || busy} onClick={handleCreate}>
        {busy ? 'Creando…' : 'Crear expediente'}
      </button>
      </div>
    </main>
  );
}
