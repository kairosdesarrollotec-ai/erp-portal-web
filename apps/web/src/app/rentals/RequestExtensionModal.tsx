import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { getFirebaseAuth } from '../providers/firebase';
import { requestExtension, RentalCommandError } from './rentals-extensions-client';
import type { RentalResponse } from './rentals-client';
import styles from './ActiveRentalScreen.module.css';
import { limaDateTimeToInstant } from '../shared/lima-time';

export interface RequestExtensionModalProps {
  open: boolean;
  rental: RentalResponse;
  companyId: string;
  branchId: string;
  onSuccess: (updated: RentalResponse) => void;
  onClose: () => void;
}

/**
 * ALQ-11 - Solicitar ampliacion (UC-ALQ-006 / BR-ALQ-012). El aviso previo de 12 h, la
 * autorizacion de Gerencia, el pago y la adenda los valida el backend; aqui solo se informa.
 */
export function RequestExtensionModal({ open, rental, companyId, branchId, onSuccess, onClose }: RequestExtensionModalProps) {
  const [newEnd, setNewEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentEnd = rental.expectedEndAt ? new Date(rental.expectedEndAt) : null;
  const parsedIso = newEnd ? limaDateTimeToInstant(newEnd) : null;
  const parsed = newEnd ? new Date(parsedIso ?? NaN) : null;
  const invalid = parsed != null && (Number.isNaN(parsed.getTime()) || (currentEnd != null && parsed <= currentEnd));
  const canSubmit = !!parsed && !invalid && !busy;

  async function submit() {
    if (!canSubmit || !parsed) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const updated = await requestExtension(idToken, rental.id, companyId, branchId, rental.version, parsed.toISOString());
      setNewEnd('');
      onSuccess(updated);
    } catch (err) {
      if (err instanceof RentalCommandError && (err.status === 409 || err.status === 412)) {
        setError('El expediente cambió. Recarga la pantalla e intenta de nuevo.');
      } else if (err instanceof RentalCommandError && err.message) {
        setError(err.message);
      } else {
        setError('No pudimos registrar la solicitud de ampliación.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} aria-describedby="ext-desc">
          <Dialog.Title className={styles.cardTitle}>Solicitar ampliación</Dialog.Title>
          <Dialog.Description id="ext-desc" className={styles.notice}>
            Requiere aviso con 12 horas de anticipación, autorización de Gerencia, pago del periodo adicional y adenda
            firmada (BR-ALQ-012). Si no se cumplen, Gerencia puede registrar falta grave (BR-ALQ-013).
          </Dialog.Description>
          <label className={styles.field}>
            Nueva fecha y hora de devolución
            <input
              className={styles.input}
              type="datetime-local"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              aria-invalid={invalid}
            />
          </label>
          {invalid && <p className={styles.error}>La nueva fecha debe ser posterior a la devolución prevista.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="button" className={styles.primary} onClick={submit} disabled={!canSubmit}>
              {busy ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
