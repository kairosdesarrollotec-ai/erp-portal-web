import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { useReservationDetail } from './useReservationDetail';
import { RESERVATION_STATUS_LABELS } from './reservation-status';
import { AppHeader } from '../shared/AppHeader';
import { useRolePermissions } from '../shared/useRolePermissions';
import styles from './ReservationDetailScreen.module.css';

/**
 * RES-04/RES-05 consolidadas en una sola pantalla (misma URL, el
 * contenido cambia segun el estado de la reserva) - PANTALLAS-V3-B-RESERVA.md.
 * Prototipos aprobados: PROTO-RES-04-BORRADOR-NO-CONFIRMADA-RES-2291,
 * PROTO-RES-04-REQUISITOS-CONFIRMACION(-MOVIL), PROTO-RES-05-DETALLE-CONFIRMADA-*.
 *
 * Simplificacion respecto al prototipo original (documentada, no
 * inventada): el backend de este primer corte (HU-27, ver PROP-005 en
 * docs/decision-log.md) modela 2 requisitos consolidados
 * (payment_validated_at, documents_completed_at), no 4 documentos
 * separados con carga de archivo individual - "Subir" aqui marca el
 * requisito como completo (no hay almacenamiento de archivos todavia).
 * "Continuar con alquiler" (RES-05) navega a /alquileres/nuevo (ALQ-02)
 * pasando cliente, vehiculo y periodo heredados de la reserva confirmada
 * via location.state (ver NewRentalScreen.tsx).
 */
export function ReservationDetailScreen() {
  const { state, reservation, context, savingRequirement, actionError, uploadPaymentVoucher, uploadDocuments, confirm, cancel, reload } =
    useReservationDetail();
  const navigate = useNavigate();
  const { can } = useRolePermissions();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelNote, setCancelNote] = useState('');

  if (state === 'LOADING') {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>Cargando reserva…</p>
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

  const isConfirmed = reservation.status === 'CONFIRMED';
  const paymentDone = Boolean(reservation.requirements.paymentValidatedAt);
  const documentsDone = Boolean(reservation.requirements.documentsCompletedAt);

  return (
    <main className={styles.wrapper}>
      <AppHeader
        actions={
          <button type="button" className={styles.linkButton} onClick={() => navigate('/reservas')}>
            Volver a la bandeja
          </button>
        }
      />

      <div className={styles.content}>
        {state === 'SYNC_CONFLICT' && (
          <div className={styles.conflictBanner}>
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
              <dt>Modalidad</dt>
              <dd>{reservation.channelMode === 'PRESENCIAL' ? 'Presencial' : 'Remota'}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.mainPanel}>
          <span className={`${styles.badge} ${isConfirmed ? styles.badgeConfirmed : styles.badgeDraft}`}>
            {RESERVATION_STATUS_LABELS[reservation.status]}
          </span>

          {actionError && <p className={styles.errorText}>{actionError}</p>}

          {!isConfirmed && reservation.status === 'DRAFT' && (
            <>
              <ul className={styles.checklist}>
                <ChecklistItem
                  label="Pago del monto de reserva vigente"
                  detail={`S/ ${reservation.requiredPayment.amount}`}
                  done={paymentDone}
                  saving={savingRequirement === 'PAYMENT_VALIDATION'}
                  onUpload={() => void uploadPaymentVoucher()}
                />
                <ChecklistItem
                  label="Documentos / contrato"
                  detail={
                    reservation.channelMode === 'VIRTUAL'
                      ? 'Incluye video 360° y documento de aceptación remota'
                      : undefined
                  }
                  done={documentsDone}
                  saving={savingRequirement === 'DOCUMENTS_COMPLETE'}
                  onUpload={() => void uploadDocuments()}
                />
              </ul>

              {paymentDone && documentsDone && can('RESERVATION', 'CONFIRM') ? (
                <button
                  type="button"
                  className={styles.confirmButton}
                  disabled={savingRequirement === 'CONFIRM'}
                  onClick={() => void confirm()}
                >
                  {savingRequirement === 'CONFIRM' ? 'Confirmando…' : 'Confirmar reserva'}
                </button>
              ) : (
                <p className={styles.helperText}>
                  La reserva se confirma automáticamente al completar los 2 requisitos.
                </p>
              )}
            </>
          )}

          {isConfirmed && (
            <>
              <p className={styles.confirmedMessage}>
                Vehículo seleccionado para esta reserva. La disponibilidad se revalidará antes de confirmar el
                alquiler o la entrega.
              </p>

              <button
                type="button"
                className={styles.confirmButton}
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
                Continuar con alquiler
              </button>

              {!showCancelForm && can('RESERVATION', 'CANCEL_CUSTOMER_REQUESTED_CHANGE') ? (
                <button type="button" className={styles.dangerLink} onClick={() => setShowCancelForm(true)}>
                  Cancelar por cambio solicitado
                </button>
              ) : showCancelForm ? (
                <div className={styles.cancelForm}>
                  <p className={styles.cancelWarning}>
                    Esto se procesará como cancelación — se pierde el monto de reserva (BR-RES-003).
                  </p>
                  <textarea
                    className={styles.cancelNote}
                    placeholder="Motivo del cambio solicitado"
                    value={cancelNote}
                    onChange={(event) => setCancelNote(event.target.value)}
                  />
                  <div className={styles.cancelActions}>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      disabled={savingRequirement === 'CANCEL'}
                      onClick={() => void cancel('CUSTOMER_REQUESTED_CHANGE', cancelNote || undefined)}
                    >
                      {savingRequirement === 'CANCEL' ? 'Cancelando…' : 'Confirmar cancelación'}
                    </button>
                    <button type="button" className={styles.linkButton} onClick={() => setShowCancelForm(false)}>
                      Volver
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function ChecklistItem({
  label,
  detail,
  done,
  saving,
  onUpload,
}: {
  label: string;
  detail?: string;
  done: boolean;
  saving: boolean;
  onUpload: () => void;
}) {
  return (
    <li className={styles.checklistItem}>
      {done ? <CheckCircle2 size={20} className={styles.checkDone} /> : <Circle size={20} className={styles.checkPending} />}
      <div className={styles.checklistText}>
        <span>{label}</span>
        {detail && <span className={styles.checklistDetail}>{detail}</span>}
      </div>
      {!done && (
        <button type="button" className={styles.uploadButton} disabled={saving} onClick={onUpload}>
          {saving ? 'Subiendo…' : 'Subir'}
        </button>
      )}
    </li>
  );
}
