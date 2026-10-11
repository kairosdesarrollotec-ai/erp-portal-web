import { useState } from 'react';
import { HrDialog } from './HrDialog';
import { formatSoles } from './hr-domain';
import styles from './HrDialog.module.css';

interface Props {
  /** Resumen en una linea de a quien se descuenta (nombre o "N personas"). */
  who: string;
  monthText: string;
  amount: number;
  detail?: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** ADP-03 - confirmacion del descuento de fin de mes con el MONTO EXACTO calculado por el sistema. */
export function DeductionConfirmDialog({ who, monthText, amount, detail, busy, error, onConfirm, onCancel }: Props) {
  const [understood, setUnderstood] = useState(false);
  return (
    <HrDialog
      titleId="deduction-title"
      title={`¿Aplicar un descuento de ${formatSoles(amount)}?`}
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <div className={styles.summary}>
        <p>
          <strong>{who}</strong> · {monthText}
        </p>
        <p>Monto exacto a descontar: {formatSoles(amount)}</p>
        {detail && <p>{detail}</p>}
      </div>
      <p className={styles.consequence}>El descuento se aplica en el pago de fin de mes y no se puede deshacer desde aquí.</p>
      <label className={styles.check}>
        <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
        Revisé el monto y confirmo que es correcto
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
        <button type="button" className={styles.primaryButton} onClick={onConfirm} disabled={busy || !understood}>
          {busy ? 'Guardando…' : `Confirmar descuento de ${formatSoles(amount)}`}
        </button>
      </div>
    </HrDialog>
  );
}
