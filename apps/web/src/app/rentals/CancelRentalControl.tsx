import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../shared/usePermissions';
import { cancelRental, RENTAL_CANCEL_REASONS, RENTAL_CANCEL_REASON_LABELS, type RentalCancelReason } from './rentals-cancel-client';
import { RentalCommandError } from './rentals-client';
import type { RentalResponse } from './rentals-client';
import { describeRentalError } from './rental-errors';
import styles from './RentalStageForms.module.css';

/** Estados en los que el back permite cancelar (DEC-ALQ-CANCEL-001): antes de la entrega. */
const CANCELLABLE = new Set(['DRAFT', 'VALIDATION', 'NOTARY_EVALUATION', 'CONTRACTING', 'PENDING_DELIVERY']);

interface Props {
  rental: Pick<RentalResponse, 'id' | 'status' | 'version'>;
  context: { companyId: string; branchId: string } | null;
  getIdToken: () => Promise<string>;
  /** Ruta a la que se vuelve tras cancelar (por defecto el expediente del alquiler). */
  onCancelled?: (cancelled: RentalResponse) => void;
}

/**
 * DEC-ALQ-CANCEL-001 (22-oct): cancelar el alquiler antes de la entrega con motivo obligatorio (documentos invalidos,
 * el cliente rechaza la notaria u otro motivo con nota). Se ofrece en las etapas ENTREGA-01..04 del asistente y solo a
 * quien tenga el permiso RENTAL.CANCEL. Libera el compromiso del vehiculo.
 */
export function CancelRentalControl({ rental, context, getIdToken, onCancelled }: Props) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<RentalCancelReason | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!can('RENTAL', 'CANCEL') || !CANCELLABLE.has(rental.status)) return null;

  const noteRequired = reason === 'OTHER';
  const noteOk = !noteRequired || note.trim().length >= 10;
  const canSubmit = reason !== '' && noteOk && !busy;

  function close() {
    setOpen(false);
    setReason('');
    setNote('');
    setError(null);
  }

  async function submit() {
    if (!context || reason === '') return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const cancelled = await cancelRental(
        idToken, rental.id, context.companyId, context.branchId, rental.version, reason, note,
      );
      if (onCancelled) onCancelled(cancelled);
      else navigate(`/alquileres/${rental.id}`, { state: context });
    } catch (err) {
      setError(
        err instanceof RentalCommandError
          ? describeRentalError(err, 'No pudimos cancelar el alquiler. Intenta de nuevo.')
          : 'No pudimos cancelar el alquiler. Intenta de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.dangerButton} onClick={() => setOpen(true)}>
        Cancelar alquiler
      </button>
      {open && (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="cancel-rental-title">
            <h2 id="cancel-rental-title" className={styles.modalTitle}>
              Cancelar alquiler
            </h2>
            <p className={styles.fieldHint}>
              Se libera el vehículo y el expediente queda cancelado. Esta acción no se puede deshacer.
            </p>
            <label className={styles.fieldLabel}>
              Motivo de la cancelación
              <select
                className={styles.select}
                value={reason}
                onChange={(e) => setReason(e.target.value as RentalCancelReason | '')}
              >
                <option value="">Selecciona un motivo</option>
                {RENTAL_CANCEL_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {RENTAL_CANCEL_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.fieldLabel}>
              Nota {noteRequired ? '(obligatoria)' : '(opcional)'}
              <textarea className={styles.textarea} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              {noteRequired && !noteOk && <span className={styles.fieldHint}>Escribe al menos 10 caracteres.</span>}
            </label>
            {error && (
              <p className={styles.evidenceError} role="alert">
                {error}
              </p>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={close} disabled={busy}>
                Volver
              </button>
              <button type="button" className={styles.dangerButton} onClick={() => void submit()} disabled={!canSubmit}>
                {busy ? 'Cancelando…' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
