import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { getFirebaseAuth } from '../providers/firebase';
import { requestRentalAirportService, type RentalResponse, RentalCommandError } from './rentals-client';
import styles from './ActiveRentalScreen.module.css';

export interface RequestAirportServiceModalProps {
  open: boolean;
  rental: RentalResponse;
  companyId: string;
  branchId: string;
  onSuccess: (updated: RentalResponse) => void;
  onClose: () => void;
}

export function RequestAirportServiceModal({
  open,
  rental,
  companyId,
  branchId,
  onSuccess,
  onClose,
}: RequestAirportServiceModalProps) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('Aeropuerto Coronel FAP Alfredo Mendívil Duarte (AYP)');
  const [additionalAmount, setAdditionalAmount] = useState('50.00');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!scheduledAt && !!location.trim() && !!additionalAmount && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const updated = await requestRentalAirportService(
        idToken,
        rental.id,
        companyId,
        branchId,
        rental.version,
        scheduledAt,
        location.trim(),
        additionalAmount,
        notes.trim() || undefined,
      );
      onSuccess(updated);
    } catch (err) {
      if (err instanceof RentalCommandError && (err.status === 409 || err.status === 412)) {
        setError('El expediente cambió. Recarga la pantalla e intenta de nuevo.');
      } else if (err instanceof RentalCommandError && err.message) {
        setError(err.message);
      } else {
        setError('No pudimos registrar la solicitud de servicio de aeropuerto.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} aria-describedby="airport-desc">
          <Dialog.Title className={styles.cardTitle}>Solicitar servicio de aeropuerto</Dialog.Title>
          <Dialog.Description id="airport-desc" className={styles.notice}>
            Servicio adicional de entrega o recojo en aeropuerto (BR-ALQ-014).
          </Dialog.Description>
          <label className={styles.field}>
            Fecha y hora pactada
            <input
              className={styles.input}
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              data-testid="modal-airport-scheduled-at"
            />
          </label>
          <label className={styles.field}>
            Lugar
            <input
              className={styles.input}
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              data-testid="modal-airport-location"
            />
          </label>
          <label className={styles.field}>
            Monto adicional (PEN)
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              required
              value={additionalAmount}
              onChange={(e) => setAdditionalAmount(e.target.value)}
              data-testid="modal-airport-amount"
            />
          </label>
          <label className={styles.field}>
            Notas (opcional)
            <textarea
              className={styles.input}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="modal-airport-notes"
            />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={submit}
              disabled={!canSubmit}
              data-testid="modal-airport-submit-btn"
            >
              {busy ? 'Guardando…' : 'Solicitar servicio'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
