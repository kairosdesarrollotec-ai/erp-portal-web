import { userLabel } from './user-label';
import { FUEL_LEVEL_LABELS } from './return-status';
import { useEffect, useState } from 'react';
import { listVehicleOperationalRecords } from '../fleet/fleet-client';
import { registerReturnFuelPenalty, type ReturnResponse } from './returns-client';
import { describeReturnError, isStaleReturnError } from './return-errors';
import { formatPen, calculateFuelPenalty, calculateFuelPenaltyByLines } from './return-financial';
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
  /** Informa la multa calculada por líneas del RNC (null si no aplica) para que la garantía la incluya en el neto. */
  onAutoPenalty?: (amount: number | null) => void;
}

/**
 * DEC-DEV-FUEL-PENALTY-001 (BDD-04 §9.6.1): penalización por combustible faltante.
 * Se descuenta de la garantía al igual que el cargo por retraso. El usuario autorizado
 * puede registrar o ajustar el monto con su sustento obligatorio.
 */
export function ManualFuelPenaltyPanel({ ret, context, getIdToken, setRet, reload, onAutoPenalty }: Props) {
  const { can } = useReturnPermissions();
  const registered = ret.fuelPenalty ?? null;
  // Decisión 28-oct #1: sugerencia = líneas del RNC faltantes (entrega vs devolución) x precio por línea del vehículo.
  const [readings, setReadings] = useState<{ delivery: number | null; returned: number | null } | null>(null);
  useEffect(() => {
    if (!context || !ret.vehicleId) return;
    let cancelled = false;
    getIdToken()
      .then((token) =>
        listVehicleOperationalRecords(token, ret.vehicleId, {
          companyId: context.companyId,
          branchId: context.branchId,
          formatType: 'FORMATO_06_RNC',
        } as never),
      )
      .then((res) => {
        if (cancelled) return;
        const items = res.items as unknown as Array<{ processType: string | null; processId: string | null; fuelLevelLines: number | null }>;
        const latest = (type: string, pid: string) => items.find((r) => r.processType === type && r.processId === pid)?.fuelLevelLines ?? null;
        setReadings({ delivery: latest('RENTAL', ret.rentalId), returned: latest('RETURN', ret.id) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [context, ret.vehicleId, ret.rentalId, ret.id, getIdToken]);
  const byLines = calculateFuelPenaltyByLines(readings?.delivery, readings?.returned, ret.vehicleFuelPenaltyPerLine);
  // Sin precio por línea en Flota no se inventa una tarifa: no hay sugerencia y el monto se registra manualmente (decisión 28-oct #1).
  useEffect(() => {
    onAutoPenalty?.(byLines);
  }, [byLines, onAutoPenalty]);
  const suggested = byLines ?? (ret.vehicleFuelPenaltyPerLine ? calculateFuelPenalty(ret.fuelLevelAtReturn, ret.vehicleFuelPenaltyPerLine) : 0);

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
              {registered.registeredById ? ` por ${userLabel(registered.registeredById)}` : ''}
            </p>
          )}
        </div>
      ) : (
        <p className={styles.summaryLine}>
          {byLines !== null ? (
            <>
              Entrega: <strong>{readings?.delivery} líneas</strong> · Devolución: <strong>{readings?.returned} líneas</strong> · Faltan{' '}
              <strong>{Math.max(0, (readings?.delivery ?? 0) - (readings?.returned ?? 0))}</strong>.
            </>
          ) : (
            <>
              Nivel recibido: <strong>{ret.fuelLevelAtReturn ? FUEL_LEVEL_LABELS[ret.fuelLevelAtReturn] : 'No registrado'}</strong>
              {ret.vehicleFuelPenaltyPerLine ? '' : ' (el vehículo aún no tiene precio por línea definido en Flota)'}.
            </>
          )}{' '}
          {ret.vehicleFuelPenaltyPerLine ? (
            <>
              Multa sugerida por faltante: <strong data-testid="fuel-penalty-suggested-amount">{formatPen(suggested)}</strong> (tarifa:{' '}
              {formatPen(ret.vehicleFuelPenaltyPerLine)} / línea).
            </>
          ) : (
            <span data-testid="fuel-penalty-no-price">Sin precio por línea no hay multa sugerida: define el precio en Flota o registra el monto manualmente.</span>
          )}
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
