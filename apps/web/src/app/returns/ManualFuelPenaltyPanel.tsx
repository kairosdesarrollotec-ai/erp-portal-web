import { useState } from 'react';
import { registerReturnFuelPenalty, type ReturnResponse } from './returns-client';
import { describeReturnError, isStaleReturnError } from './return-errors';
import { formatPen, calculateFuelPenalty } from './return-financial';
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
 * DEC-DEV-FUEL-PENALTY-001 (BDD-04 §9.6.1): penalización por combustible faltante.
 * Se descuenta de la garantía al igual que el cargo por retraso. El usuario autorizado
 * puede registrar o ajustar el monto con su sustento obligatorio.
 */
export function ManualFuelPenaltyPanel({ ret, context, getIdToken, setRet, reload }: Props) {
  const { can } = useReturnPermissions();
  const registered = ret.fuelPenalty ?? null;
  const suggested = calculateFuelPenalty(ret.fuelLevelAtReturn, ret.vehicleFuelPenaltyPerLine ?? 50.00);

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closed = ret.status === 'CERRADA' || ret.status === 'CANCELADA' || ret.status === 'PROGRAMADA';
  // Solo se muestra si hay combustible no FULL o ya hay multa registrada
  if (!registered && suggested === 0 && ret.fuelLevelAtReturn === 'FULL') return null;

  const canRegister = (can('CHARGE_IMMOBILIZATION') || can('CLOSE_FINANCIAL')) && !closed;
  const parsed = Number(amount);
  const amountValid = amount.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && Math.round(parsed * 100) / 100 === parsed;
  const reasonValid = reason.trim().length >= 3;

  async function handleSubmit() {
    if (!context || !amountValid || !reasonValid) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await registerReturnFuelPenalty(
        idToken,
        ret.id,
        context.companyId,
        context.branchId,
        ret.version,
        parsed,
        reason.trim(),
      );
      setRet(updated);
      setAmount('');
      setReason('');
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos registrar la multa de combustible. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.lateChargePanel} aria-label="Penalización por combustible faltante">
      <h2 className={styles.lateChargeHeading}>Multa por combustible faltante (BDD-04 §9.6.1)</h2>

      {registered ? (
        <div className={styles.lateChargeRegistered}>
          <p className={styles.summaryLine}>
            Monto registrado:{' '}
            <strong data-testid="fuel-penalty-registered-amount">{formatPen(registered.amount)}</strong>
          </p>
          {registered.notes && <p className={styles.summaryLine}>Sustento: {registered.notes}</p>}
          {registered.registeredAt && (
            <p className={styles.summaryLine}>
              Registrado: {formatLimaDateTime(registered.registeredAt)}
              {registered.registeredById ? ` por ${registered.registeredById}` : ''}
            </p>
          )}
        </div>
      ) : (
        <p className={styles.summaryLine}>
          Nivel recibido: <strong>{ret.fuelLevelAtReturn ?? 'No registrado'}</strong>. Multa sugerida por faltante:{' '}
          <strong data-testid="fuel-penalty-suggested-amount">{formatPen(suggested)}</strong> (tarifa:{' '}
          {formatPen(ret.vehicleFuelPenaltyPerLine ?? 50.00)} / línea).
        </p>
      )}

      {error && (
        <p className={`${styles.banner} ${styles.banner_error}`} role="alert">
          {error}
        </p>
      )}

      {canRegister && (
        <fieldset className={styles.lateChargeForm} disabled={busy}>
          <legend className={styles.lateChargeLegend}>
            {registered ? 'Ajustar monto de penalización' : 'Registrar penalización manual / ajustada'}
          </legend>
          <div className={styles.lateChargeRow}>
            <label className={styles.fieldLabel}>
              Monto (S/)
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder={registered ? String(registered.amount) : String(suggested)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={styles.input}
                aria-label="Monto de multa por combustible"
              />
            </label>
            <label className={styles.fieldLabel} style={{ flex: 2 }}>
              Motivo / Sustento *
              <input
                type="text"
                placeholder="Ej. Faltan 2 líneas según odómetro de recepción"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={styles.input}
                aria-label="Motivo de multa por combustible"
              />
            </label>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleSubmit}
              disabled={!amountValid || !reasonValid || busy}
            >
              {busy ? 'Guardando…' : registered ? 'Ajustar multa' : 'Registrar multa'}
            </button>
          </div>
        </fieldset>
      )}
    </section>
  );
}
