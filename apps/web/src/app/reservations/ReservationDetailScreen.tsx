import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { useReservationDetail } from './useReservationDetail';
import { RESERVATION_STATUS_LABELS } from './reservation-status';
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
 * separados con carga de archivo individual.
 *
 * Hallazgo de revision (finding #2): el control del checklist NUNCA sube
 * ni guarda ningun archivo - el backend (TDD-RES-001.md 11.2/11.3) solo
 * marca un timestamp de validacion, no existe almacenamiento de evidencia
 * todavia. El texto "Subir"/"Subiendo…" comunicaba una accion que no
 * ocurre realmente; ahora dice "Marcar como validado"/"Guardando…" y hay
 * una nota explicita de que no se guarda ningun archivo.
 *
 * Hallazgo de revision (finding #4): ya no existe un boton manual
 * "Confirmar reserva" - ver el comentario en useReservationDetail.ts
 * (maybeAutoConfirm). Aqui solo se refleja el estado que produce el hook:
 * mientras faltan requisitos se explica que la confirmacion es
 * automatica, y mientras esta en curso (isMutating con
 * savingRequirement === 'CONFIRM') se muestra "Confirmando…".
 */
export function ReservationDetailScreen() {
  const { state, reservation, savingRequirement, isMutating, actionError, uploadPaymentVoucher, uploadDocuments, cancel, reload } =
    useReservationDetail();
  const navigate = useNavigate();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [cancelNoteTouched, setCancelNoteTouched] = useState(false);

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
  const isConfirming = savingRequirement === 'CONFIRM';

  // Hallazgo de revision (finding #5): el motivo de cancelacion no puede
  // enviarse vacio - la UI lo pide explicitamente ("Motivo del cambio
  // solicitado") pero antes se podia enviar sin escribir nada.
  const cancelNoteTrimmed = cancelNote.trim();
  const cancelNoteInvalid = cancelNoteTouched && cancelNoteTrimmed.length === 0;

  function handleCancelSubmit() {
    if (cancelNoteTrimmed.length === 0) {
      setCancelNoteTouched(true);
      return;
    }
    void cancel('CUSTOMER_REQUESTED_CHANGE', cancelNoteTrimmed);
  }

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.brand}>VeloxRent</span>
        <button type="button" className={styles.linkButton} onClick={() => navigate('/reservas')}>
          Volver a la bandeja
        </button>
      </header>

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
                  disabled={isMutating}
                  onMark={() => void uploadPaymentVoucher()}
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
                  disabled={isMutating}
                  onMark={() => void uploadDocuments()}
                />
              </ul>
              <p className={styles.helperText}>
                No se sube ni se guarda ningún archivo todavía: cada requisito solo se marca como validado.
              </p>

              {isConfirming ? (
                <p className={styles.helperText}>Confirmando…</p>
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

              <button type="button" className={styles.confirmButton} disabled title="Disponible cuando exista el módulo de Alquiler (HU-28)">
                Continuar con alquiler
              </button>
              <p className={styles.helperText}>
                Disponible cuando exista el módulo de Alquiler (HU-28, todavía no construido).
              </p>

              {!showCancelForm ? (
                <button type="button" className={styles.dangerLink} disabled={isMutating} onClick={() => setShowCancelForm(true)}>
                  Cancelar por cambio solicitado
                </button>
              ) : (
                <div className={styles.cancelForm}>
                  <p className={styles.cancelWarning}>
                    Esto se procesará como cancelación — se pierde el monto de reserva (BR-RES-003).
                  </p>
                  <textarea
                    className={styles.cancelNote}
                    placeholder="Motivo del cambio solicitado"
                    value={cancelNote}
                    disabled={isMutating}
                    onChange={(event) => {
                      setCancelNote(event.target.value);
                      if (cancelNoteTouched) setCancelNoteTouched(false);
                    }}
                    onBlur={() => setCancelNoteTouched(true)}
                  />
                  {cancelNoteInvalid && (
                    <p className={styles.errorText}>Escribe el motivo del cambio solicitado antes de continuar.</p>
                  )}
                  <div className={styles.cancelActions}>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      disabled={isMutating || cancelNoteTrimmed.length === 0}
                      onClick={handleCancelSubmit}
                    >
                      {savingRequirement === 'CANCEL' ? 'Cancelando…' : 'Confirmar cancelación'}
                    </button>
                    <button type="button" className={styles.linkButton} disabled={isMutating} onClick={() => setShowCancelForm(false)}>
                      Volver
                    </button>
                  </div>
                </div>
              )}
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
  disabled,
  onMark,
}: {
  label: string;
  detail?: string;
  done: boolean;
  saving: boolean;
  disabled: boolean;
  onMark: () => void;
}) {
  return (
    <li className={styles.checklistItem}>
      {done ? <CheckCircle2 size={20} className={styles.checkDone} /> : <Circle size={20} className={styles.checkPending} />}
      <div className={styles.checklistText}>
        <span>{label}</span>
        {detail && <span className={styles.checklistDetail}>{detail}</span>}
      </div>
      {!done && (
        <button type="button" className={styles.uploadButton} disabled={disabled} onClick={onMark}>
          {saving ? 'Guardando…' : 'Marcar como validado'}
        </button>
      )}
    </li>
  );
}
