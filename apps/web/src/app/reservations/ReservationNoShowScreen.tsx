import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservationDetail } from './useReservationDetail';
import { useRolePermissions } from '../shared/useRolePermissions';
import { ResolutionShell } from './ResolutionShell';
import detail from './ReservationDetailScreen.module.css';
import styles from './ReservationResolution.module.css';

/**
 * RES-08 - Protocolo de no-show y conversión (BR-RES-002/003, EX-RES-004).
 * "Se presentó" -> ALQ-02 (crea el alquiler desde la reserva, que pasa a CONVERTED).
 * "No se presentó" -> cancel NO_SHOW: solo Gerencia, se pierde el monto, confirmación explícita.
 */
export function ReservationNoShowScreen() {
  const { state, reservation, context, savingRequirement, actionError, cancel, reload } = useReservationDetail();
  const navigate = useNavigate();
  const { can } = useRolePermissions();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  async function confirmNoShow() {
    const result = await cancel('NO_SHOW', note.trim() || undefined);
    if (result) setDone(true);
  }

  return (
    <ResolutionShell state={state} reservation={reservation} title="Protocolo de no-show" reload={reload}>
      {done ? (
        <>
          <p className={styles.successBox} role="status">
            No-show registrado: la reserva quedó cancelada y el monto de reserva se pierde.
          </p>
          <button type="button" className={detail.linkButton} onClick={() => navigate('/reservas')}>
            Volver a la bandeja
          </button>
        </>
      ) : reservation && reservation.status !== 'CONFIRMED' ? (
        <>
          <p className={styles.noteBox}>Solo una reserva confirmada puede pasar por el protocolo de no-show.</p>
          <button type="button" className={detail.linkButton} onClick={() => navigate(`/reservas/${reservation.id}`)}>
            Volver a la reserva
          </button>
        </>
      ) : reservation && !reservation.startDatePassed ? (
        <>
          <p className={styles.noteBox}>
            Disponible desde el {new Date(reservation.startAt).toLocaleDateString('es-PE')}, fecha pactada de la reserva.
          </p>
          <button type="button" className={detail.linkButton} onClick={() => navigate(`/reservas/${reservation.id}`)}>
            Volver a la reserva
          </button>
        </>
      ) : (
        reservation && (
          <>
            <p className={styles.noteBox}>Ya llegó la fecha pactada. ¿El cliente se presentó?</p>
            {actionError && <p className={detail.errorText} role="alert">{actionError}</p>}
            {!confirming && (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={detail.confirmButton}
                  onClick={() =>
                    navigate('/alquileres/nuevo', {
                      state: {
                        ...context,
                        reservationId: reservation.id,
                        customerId: reservation.customer.id,
                        customerName: reservation.customer.name,
                        vehicleId: reservation.vehicle.id,
                        vehicleLabel: reservation.vehicle.label,
                        startAt: reservation.startAt,
                        expectedEndAt: reservation.endAt,
                      },
                    })
                  }
                >
                  Se presentó
                </button>
                {can('RESERVATION', 'CANCEL_NO_SHOW') ? (
                  <button type="button" className={detail.dangerLink} onClick={() => setConfirming(true)}>
                    No se presentó
                  </button>
                ) : (
                  <button type="button" className={detail.dangerLink} disabled aria-describedby="noshow-role-note">
                    No se presentó
                  </button>
                )}
              </div>
            )}
            {!confirming && !can('RESERVATION', 'CANCEL_NO_SHOW') && (
              <p id="noshow-role-note" className={styles.disabledNote}>
                Solo Gerencia puede registrar el no-show.
              </p>
            )}
            {confirming && (
              <div className={detail.cancelForm}>
                <p className={styles.warningBox} role="alert">
                  Esta acción cancela la reserva y el cliente pierde el monto de reserva (S/ {reservation.requiredPayment.amount}). No se puede deshacer.
                </p>
                <label className={styles.field}>
                  Observación (opcional)
                  <textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={detail.dangerButton}
                    disabled={savingRequirement === 'CANCEL'}
                    onClick={() => void confirmNoShow()}
                  >
                    {savingRequirement === 'CANCEL' ? 'Registrando…' : 'Confirmar no-show y perder el monto'}
                  </button>
                  <button type="button" className={detail.linkButton} onClick={() => setConfirming(false)}>
                    Volver
                  </button>
                </div>
              </div>
            )}
          </>
        )
      )}
    </ResolutionShell>
  );
}
