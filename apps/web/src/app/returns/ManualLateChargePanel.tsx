import { useState } from 'react';
import { registerReturnLateCharge, type ReturnResponse } from './returns-client';
import { describeReturnError, isStaleReturnError } from './return-errors';
import { formatPen } from './return-financial';
import { formatLimaDateTime } from '../shared/lima-time';
import { useReturnPermissions } from './return-permissions';
import type { ReturnsWorkContext } from './useWorkContextForReturns';
import styles from './ReturnForms.module.css';

interface Props {
  ret: ReturnResponse;
  context: ReturnsWorkContext | null;
  getIdToken: () => Promise<string>;
  setRet: (ret: ReturnResponse) => void;
  reload: () => Promise<void>;
}

/**
 * DEC-DEV-LATE-CHARGE-002 (Fiorella, 2026-10-16) - Cargo por retraso MANUAL: pasada la tolerancia de 30 min SI hay cargo,
 * pero el monto lo digita un usuario autorizado (sin calculo automatico; el cargo sugerido de DEC-DEV-LATE-CHARGE-001 es
 * solo referencia). Solo aparece si la devolucion supera la tolerancia (lateness.isLate) o ya tiene un cargo registrado.
 * Volver a registrar corrige el monto (queda auditado).
 */
export function ManualLateChargePanel({ ret, context, getIdToken, setRet, reload }: Props) {
  const { can } = useReturnPermissions();
  const registered = ret.manualLateCharge ?? null;
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closed = ret.status === 'CERRADA' || ret.status === 'CANCELADA' || ret.status === 'PROGRAMADA';
  if (!registered && !ret.lateness?.isLate) return null;

  const canRegister = can('CHARGE_IMMOBILIZATION') && !closed;
  const parsed = Number(amount);
  const amountValid = amount.trim() !== '' && Number.isFinite(parsed) && parsed > 0 && Math.round(parsed * 100) / 100 === parsed;

  async function handleSubmit() {
    if (!context || !amountValid) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await registerReturnLateCharge(
        idToken,
        ret.id,
        context.companyId,
        context.branchId,
        ret.version,
        parsed,
        notes.trim() || undefined,
      );
      setRet(updated);
      setAmount('');
      setNotes('');
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos registrar el cargo por retraso. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.reviewSection} aria-label="Cargo por retraso" data-testid="manual-late-charge">
      <p className={styles.reviewSectionTitle}>Cargo por retraso (manual)</p>
      {registered ? (
        <p className={styles.summaryLine} data-testid="manual-late-charge-registered">
          Cargo registrado: {formatPen(registered.amount)}
          {registered.registeredAt ? ` · ${formatLimaDateTime(registered.registeredAt)}` : ''}
          {registered.notes ? ` · ${registered.notes}` : ''}
        </p>
      ) : (
        <p className={styles.summaryLine}>
          La devolución superó la tolerancia de 30 minutos: corresponde cargo por retraso. El monto se digita manualmente
          (no hay cálculo automático).
        </p>
      )}
      {canRegister ? (
        <>
          <label className={styles.fieldLabel}>
            Monto del cargo por retraso (S/)
            <input
              className={styles.input}
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className={styles.fieldLabel}>
            Observaciones (opcional)
            <textarea className={styles.textarea} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {error && (
            <p className={`${styles.banner} ${styles.banner_error}`} role="alert">
              {error}
            </p>
          )}
          <button type="button" className={styles.secondaryButton} onClick={handleSubmit} disabled={!amountValid || busy}>
            {busy ? 'Guardando…' : registered ? 'Corregir cargo por retraso' : 'Registrar cargo por retraso'}
          </button>
        </>
      ) : (
        !registered && <p className={styles.summaryLine}>Pendiente de registro por un usuario autorizado.</p>
      )}
    </section>
  );
}
