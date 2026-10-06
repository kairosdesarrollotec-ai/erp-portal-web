import { useState, type FormEvent } from 'react';
import { IncidentDialog } from './IncidentDialog';
import { MAX_TEXT_LENGTH } from './incident-domain';
import styles from './IncidentDialog.module.css';

interface Props {
  titleId: string;
  title: string;
  /** Etiqueta del campo de texto obligatorio (resumen de resolucion, motivo...). */
  fieldLabel: string;
  confirmLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

/** Dialogo con un unico texto obligatorio: "Resolver" en fila (resumen) y "Derivar a via legal" (motivo). */
export function ReasonDialog({ titleId, title, fieldLabel, confirmLabel, busy, error, onConfirm, onCancel }: Props) {
  const [text, setText] = useState('');
  const trimmed = text.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || busy) return;
    onConfirm(trimmed);
  }

  return (
    <IncidentDialog titleId={titleId} title={title} onClose={onCancel}>
      <form onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor={`${titleId}-field`}>{fieldLabel}</label>
          <textarea
            id={`${titleId}-field`}
            className={styles.input}
            value={text}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(e) => setText(e.target.value)}
            aria-required="true"
          />
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className={styles.primaryButton} disabled={!trimmed || busy}>
            {busy ? 'Guardando…' : confirmLabel}
          </button>
        </div>
      </form>
    </IncidentDialog>
  );
}
