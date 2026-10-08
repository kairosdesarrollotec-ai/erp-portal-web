import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import styles from './RecruitmentDialog.module.css';

interface Props {
  candidateName: string;
  busy: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** REC-04 "Descartar": el motivo es obligatorio y la decision es irreversible. */
export function DiscardCandidateDialog({ candidateName, busy, error, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || busy) return;
    onConfirm(trimmed);
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.card} aria-labelledby="discard-title" aria-describedby="discard-warning">
          <Dialog.Title id="discard-title" className={styles.title}>Descartar a {candidateName}</Dialog.Title>
          <p id="discard-warning" className={styles.warning}>
            Esta decisión es irreversible: el candidato quedará como no contratado y no podrá cambiarse después.
          </p>
          <form onSubmit={submit} noValidate>
            <div className={styles.field}>
              <label htmlFor="discard-reason">Motivo del descarte</label>
              <textarea id="discard-reason" className={styles.input} value={reason} maxLength={1000}
                onChange={(e) => setReason(e.target.value)} aria-required="true" />
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>Cancelar</button>
              <button type="submit" className={styles.dangerButton} disabled={!trimmed || busy}>
                {busy ? 'Guardando…' : 'Descartar candidato'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
