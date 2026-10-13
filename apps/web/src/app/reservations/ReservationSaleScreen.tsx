import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservationDetail } from './useReservationDetail';
import { useAlternativeVehicles } from './useAlternativeVehicles';
import { useRolePermissions } from '../shared/useRolePermissions';
import { AlternativesList } from './AlternativesList';
import { ResolutionShell } from './ResolutionShell';
import detail from './ReservationDetailScreen.module.css';
import styles from './ReservationResolution.module.css';

/**
 * RES-07 - Venta de vehículo reservado (BR-RES-007, UC-RES-004).
 * CONFIRMED: Gerencia/Administración registra la venta y ofrece alternativa.
 * PENDING_SALE_RESOLUTION: se resuelve - aceptar alternativa (reserva vuelve a DRAFT -> RES-04)
 * o rechazar (cancelada, reembolso pendiente de transferencia por Gerencia).
 */
export function ReservationSaleScreen() {
  const { state, reservation, context, savingRequirement, actionError, vehicleUnavailable, flagSale, resolveSale, reload } =
    useReservationDetail();
  const navigate = useNavigate();
  const { can } = useRolePermissions();
  const status = reservation?.status;
  const alternatives = useAlternativeVehicles(
    reservation,
    context,
    status === 'CONFIRMED' || status === 'PENDING_SALE_RESOLUTION',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirmingReject, setConfirmingReject] = useState(false);

  const resolution = reservation?.saleResolution ?? null;
  const offered = resolution?.status === 'PENDING' ? resolution.offeredVehicle : null;
  const effectiveAlternative = selectedId ?? offered?.id ?? null;
  const busy = savingRequirement === 'FLAG_SALE' || savingRequirement === 'RESOLVE_SALE';

  async function accept() {
    if (!effectiveAlternative) return;
    const result = await resolveSale('ACCEPT_ALTERNATIVE', { alternativeVehicleId: effectiveAlternative, note: note.trim() || undefined });
    if (result) navigate(`/reservas/${result.id}`, { state: context });
  }

  async function reject() {
    await resolveSale('REJECT', { note: note.trim() || undefined });
    setConfirmingReject(false);
  }

  return (
    <ResolutionShell state={state} reservation={reservation} title="Venta de vehículo reservado" reload={reload}>
      {reservation && (
        <>
          {actionError && <p className={detail.errorText} role="alert">{actionError}</p>}
          {vehicleUnavailable && <p className={detail.unavailableAlert} role="alert">{vehicleUnavailable}</p>}

          {status === 'CONFIRMED' &&
            (can('RESERVATION', 'FLAG_SALE') ? (
              <>
                <p className={styles.noteBox}>
                  Registrar la venta pone la reserva en “Pendiente de resolver” hasta que el cliente decida sobre la alternativa.
                </p>
                <AlternativesList
                  state={alternatives.state}
                  vehicles={alternatives.vehicles}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onRetry={alternatives.retry}
                  legend="Alternativa a ofrecer (opcional)"
                />
                <label className={styles.field}>
                  Nota para el cliente (opcional)
                  <textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
                </label>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={detail.dangerButton}
                    disabled={busy}
                    onClick={() =>
                      void flagSale({ alternativeVehicleId: selectedId ?? undefined, note: note.trim() || undefined })
                    }
                  >
                    {savingRequirement === 'FLAG_SALE' ? 'Registrando…' : 'Registrar venta del vehículo'}
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.noteBox}>Solo Gerencia o Administración pueden registrar la venta de un vehículo reservado.</p>
            ))}

          {status === 'PENDING_SALE_RESOLUTION' && (
            <>
              <p className={styles.warningBox}>
                El vehículo reservado fue vendido. El cliente debe aceptar una alternativa o recibir el reembolso.
              </p>
              {resolution?.offeredVehicle && (
                <p className={styles.noteBox}>Alternativa ofrecida: {resolution.offeredVehicle.label}</p>
              )}
              {resolution?.offerNote && <p className={styles.noteBox}>Nota: {resolution.offerNote}</p>}
              {can('RESERVATION', 'RESOLVE_SALE') ? (
                <>
                  <AlternativesList
                    state={alternatives.state}
                    vehicles={alternatives.vehicles}
                    selectedId={effectiveAlternative}
                    onSelect={setSelectedId}
                    onRetry={alternatives.retry}
                    legend="Alternativa elegida por el cliente"
                  />
                  <label className={styles.field}>
                    Nota de resolución (opcional)
                    <textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
                  </label>
                  {!confirmingReject ? (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={detail.confirmButton}
                        disabled={busy || !effectiveAlternative}
                        onClick={() => void accept()}
                      >
                        {savingRequirement === 'RESOLVE_SALE' ? 'Procesando…' : 'Aceptar alternativa'}
                      </button>
                      <button type="button" className={detail.dangerLink} disabled={busy} onClick={() => setConfirmingReject(true)}>
                        El cliente rechaza
                      </button>
                    </div>
                  ) : (
                    <div className={detail.cancelForm}>
                      <p className={styles.warningBox} role="alert">
                        Se cancelará la reserva y se reembolsará el monto pagado (S/ {reservation.requiredPayment.amount}). Gerencia debe transferirlo manualmente.
                      </p>
                      <div className={styles.actions}>
                        <button type="button" className={detail.dangerButton} disabled={busy} onClick={() => void reject()}>
                          {savingRequirement === 'RESOLVE_SALE' ? 'Cancelando…' : 'Confirmar cancelación con reembolso'}
                        </button>
                        <button type="button" className={detail.linkButton} onClick={() => setConfirmingReject(false)}>
                          Volver
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className={styles.noteBox}>Solo Gerencia o Administración pueden resolver la venta.</p>
              )}
            </>
          )}

          {status === 'CANCELLED' && resolution?.status === 'REJECTED' && (
            <>
              <p className={styles.successBox} role="status">Reserva cancelada por venta del vehículo.</p>
              {resolution.refundStatus === 'PENDING_TRANSFER' && (
                <p className={styles.warningBox}>
                  Reembolso pendiente de transferencia: Gerencia debe devolver S/ {reservation.requiredPayment.amount} al cliente.
                </p>
              )}
              <button type="button" className={detail.linkButton} onClick={() => navigate('/reservas')}>
                Volver a la bandeja
              </button>
            </>
          )}

          {status !== 'CONFIRMED' && status !== 'PENDING_SALE_RESOLUTION' && !(status === 'CANCELLED' && resolution?.status === 'REJECTED') && (
            <>
              <p className={styles.noteBox}>Esta reserva no admite el registro ni la resolución de una venta en su estado actual.</p>
              <button type="button" className={detail.linkButton} onClick={() => navigate(`/reservas/${reservation.id}`)}>
                Volver a la reserva
              </button>
            </>
          )}
        </>
      )}
    </ResolutionShell>
  );
}
