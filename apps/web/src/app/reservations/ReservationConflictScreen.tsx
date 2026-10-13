import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReservationDetail } from './useReservationDetail';
import { useAlternativeVehicles } from './useAlternativeVehicles';
import { AlternativesList } from './AlternativesList';
import { useRolePermissions } from '../shared/useRolePermissions';
import { ResolutionShell } from './ResolutionShell';
import { VEHICLE_NOT_AVAILABLE_MESSAGE } from './reservations-client';
import detail from './ReservationDetailScreen.module.css';
import styles from './ReservationResolution.module.css';

/**
 * RES-06 - Conflicto y alternativas (EX-RES-005). Entrada: RES-04 cuando confirmar responde
 * 409 VEHICLE_NOT_AVAILABLE. Lista los vehículos libres en la ventana de la reserva.
 * "Continuar" ejecuta change-vehicle (RESERVATION.CHANGE_VEHICLE) y, al éxito, navega a RES-04 con el
 * vehículo ya cambiado; "Cancelar" sale a la bandeja.
 */
export function ReservationConflictScreen() {
  const { state, reservation, context, reload, changeVehicle, savingRequirement, actionError, vehicleUnavailable } = useReservationDetail();
  const navigate = useNavigate();
  const { can } = useRolePermissions();
  const canChange = can('RESERVATION', 'CHANGE_VEHICLE');
  const location = useLocation();
  const conflictDetail = (location.state as { conflictDetail?: string } | null)?.conflictDetail;
  const alternatives = useAlternativeVehicles(reservation, context, state !== 'LOADING' && state !== 'RECOVERABLE_ERROR');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = alternatives.vehicles.find((v) => v.id === selectedId);
  const changing = savingRequirement === 'CHANGE_VEHICLE';

  async function onContinue() {
    if (!reservation || !selected) return;
    const updated = await changeVehicle(selected.id);
    if (updated) navigate(`/reservas/${reservation.id}`, { state: context });
  }

  return (
    <ResolutionShell state={state} reservation={reservation} title="Conflicto de vehículo" reload={reload}>
      {reservation && reservation.status !== 'DRAFT' ? (
        <>
          <p className={styles.noteBox}>Esta reserva ya no está en borrador; no hay conflicto que resolver aquí.</p>
          <button type="button" className={detail.linkButton} onClick={() => navigate(`/reservas/${reservation.id}`)}>
            Volver a la reserva
          </button>
        </>
      ) : (
        reservation && (
          <>
            <p role="alert" className={detail.unavailableAlert}>
              {conflictDetail?.trim() || VEHICLE_NOT_AVAILABLE_MESSAGE}
            </p>
            <AlternativesList
              state={alternatives.state}
              vehicles={alternatives.vehicles}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRetry={alternatives.retry}
              legend="Vehículos libres en las fechas de la reserva"
            />
            {actionError && <p className={detail.errorText} role="alert">{actionError}</p>}
            {vehicleUnavailable && <p className={detail.unavailableAlert} role="alert">{vehicleUnavailable}</p>}
            {!canChange && (
              <p className={styles.noteBox}>Tu rol no puede cambiar el vehículo de una reserva. Pide a Front Office, Gerencia o Administración que lo haga.</p>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className={detail.confirmButton}
                disabled={!selected || !canChange || changing}
                onClick={() => void onContinue()}
              >
                {changing ? 'Cambiando vehículo…' : 'Continuar con la alternativa'}
              </button>
              <button type="button" className={detail.dangerLink} onClick={() => navigate('/reservas')}>
                Cancelar
              </button>
            </div>
            <p className={styles.disabledNote}>
              Si el cliente no acepta ninguna alternativa, el reembolso del monto pagado es inmediato y lo transfiere Gerencia.
            </p>
          </>
        )
      )}
    </ResolutionShell>
  );
}
