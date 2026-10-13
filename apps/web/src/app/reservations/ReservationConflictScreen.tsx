import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReservationDetail } from './useReservationDetail';
import { useAlternativeVehicles } from './useAlternativeVehicles';
import { AlternativesList, vehicleLabel } from './AlternativesList';
import { ResolutionShell } from './ResolutionShell';
import { VEHICLE_NOT_AVAILABLE_MESSAGE } from './reservations-client';
import detail from './ReservationDetailScreen.module.css';
import styles from './ReservationResolution.module.css';

/**
 * RES-06 - Conflicto y alternativas (EX-RES-005). Entrada: RES-04 cuando confirmar responde
 * 409 VEHICLE_NOT_AVAILABLE. Lista los vehículos libres en la ventana de la reserva.
 * "Continuar" vuelve a RES-04 con la alternativa elegida en location.state; "Cancelar" sale a la bandeja.
 *
 * Nota: el backend no tiene (0.6.0) un comando para cambiar el vehículo de un borrador, así que la
 * alternativa viaja como sugerencia en el estado de navegación y RES-04 la muestra como aviso.
 */
export function ReservationConflictScreen() {
  const { state, reservation, context, reload } = useReservationDetail();
  const navigate = useNavigate();
  const location = useLocation();
  const conflictDetail = (location.state as { conflictDetail?: string } | null)?.conflictDetail;
  const alternatives = useAlternativeVehicles(reservation, context, state !== 'LOADING' && state !== 'RECOVERABLE_ERROR');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = alternatives.vehicles.find((v) => v.id === selectedId);

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
            <div className={styles.actions}>
              <button
                type="button"
                className={detail.confirmButton}
                disabled={!selected}
                onClick={() =>
                  navigate(`/reservas/${reservation.id}`, {
                    state: {
                      ...context,
                      alternativeVehicle: selected ? { id: selected.id, label: vehicleLabel(selected) } : undefined,
                    },
                  })
                }
              >
                Continuar con la alternativa
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
