import { useState } from 'react';
import { HrDialog } from './HrDialog';
import { TERMINATION_REASON_LABEL, formatSoles, type TerminationReason } from './hr-domain';
import styles from './HrDialog.module.css';

interface Props {
  employeeName: string;
  reason: TerminationReason;
  noticeDays: number;
  settlementPaid: boolean;
  settlementAmount: number;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** ADP-09 - confirmacion reforzada de una accion IRREVERSIBLE que ademas genera una vacante en Reclutamiento. */
export function TerminationConfirmDialog({ employeeName, reason, noticeDays, settlementPaid, settlementAmount, busy, error, onConfirm, onCancel }: Props) {
  const [understood, setUnderstood] = useState(false);
  return (
    <HrDialog
      titleId="termination-title"
      title={`¿Confirmar el término de ${employeeName}?`}
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <div className={styles.summary}>
        <p>Tipo: {TERMINATION_REASON_LABEL[reason]}</p>
        <p>Aviso: {noticeDays > 0 ? `${noticeDays} días` : 'sin previo aviso'}</p>
        <p>
          Quincena pendiente: {settlementPaid ? 'pagada' : 'sin pagar'}
          {settlementAmount > 0 ? ` (${formatSoles(settlementAmount)})` : ''}
        </p>
      </div>
      <p className={styles.consequence}>Esta acción no se puede deshacer. Esto genera automáticamente una nueva vacante en Reclutamiento (se crea unos instantes después).</p>
      <label className={styles.check}>
        <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
        Entiendo que el término es irreversible
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className={styles.dangerSolid} onClick={onConfirm} disabled={busy || !understood}>
          {busy ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
    </HrDialog>
  );
}
