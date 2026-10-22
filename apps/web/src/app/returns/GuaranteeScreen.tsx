import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';
import { returnFlowGuard } from './ReturnGuards';
import { useReturnFlow } from './useReturnFlow';
import { DamageLog } from './DamageLog';
import { ManualLateChargePanel } from './ManualLateChargePanel';
import { useCosmeticTariff } from './useCosmeticTariff';
import { damagesWithoutAmount, formatPen, hasGraveDamage, totalCharges } from './return-financial';
import { closeFinancial } from './returns-client';
import { getRental, RentalResponse } from '../rentals/rentals-client';
import { describeReturnError, isIncidentOpenError, isStaleReturnError } from './return-errors';
import { FUEL_LEVEL_LABELS, GUARANTEE_WINDOW_HOURS, hoursSince } from './return-status';
import { useReturnPermissions } from './return-permissions';
import styles from './ReturnForms.module.css';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * DEV-09 - Resolucion de garantia. Dos entradas: directo desde DEV-05 sin
 * dano (monto = garantia completa, calculo automatico) o desde DEV-07/08 con
 * dano valorado (descuento = danos + paralizacion del EXPEDIENTE: ret.damages /
 * ret.immobilizationCharges, vigentes aunque se recargue u opere en otro
 * dispositivo). Con danos registrados no se pide monto a mano. Siempre exige
 * confirmacion reforzada con el monto exacto. Nunca se libera con incidencia
 * abierta (DR-DEV-001 / INCIDENT_STILL_OPEN, HTTP 422 -> estado BLOCKED).
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-09-RESOLUCION-DE-GARANTIA-ALQ-1187 / -DEV-0456, PROTO-DEV-09-BLOQUEADA-POR-INCIDENCIA-INC-0234.
 */
export function GuaranteeScreen() {
  const { id, state, ret, context, getIdToken, setRet, reload } = useReturnFlow();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const [rental, setRental] = useState<RentalResponse | null>(null);
  const [rentalError, setRentalError] = useState(false);
  const [retainedInput, setRetainedInput] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const tariff = useCosmeticTariff(
    context,
    getIdToken,
    Boolean(ret?.damages?.some((d) => d.origin === 'AESTHETIC')),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rentalId = ret?.rentalId;
  useEffect(() => {
    if (!context || !rentalId) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await getIdToken();
        const result = await getRental(idToken, rentalId, context.companyId, context.branchId);
        if (!cancelled) setRental(result);
      } catch {
        if (!cancelled) setRentalError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context, rentalId, getIdToken]);

  const guard = returnFlowGuard({ state, hasReturn: Boolean(ret) });
  if (guard || !ret) return guard;

  const damages = ret.damages;
  const charges = ret.immobilizationCharges;
  // Conductor de la empresa: sin garantia (DEC-ALQ-COMPANY-DRIVER-004). close-financial con montos > 0 da 422.
  const noDeposit = ret.depositRequired === false || rental?.depositRequired === false;
  const depositAmount = rental?.deposit && !noDeposit ? Number(rental.deposit.originalAmount) : null;
  const currency = rental?.deposit?.currency ?? 'PEN';
  const computedRetained = ret.status === 'SIN_DANOS' ? 0 : totalCharges(damages, charges);
  const hasRecordedCharges = damages.length > 0 || charges.length > 0;
  const pendingAmount = damagesWithoutAmount(damages).length;
  const retainedRaw = retainedInput === null ? computedRetained : Number(retainedInput);
  const retainedValid = Number.isFinite(retainedRaw) && retainedRaw >= 0;
  const retained = depositAmount === null || !retainedValid ? 0 : Math.min(round2(retainedRaw), depositAmount);
  const refund = depositAmount === null ? 0 : round2(depositAmount - retained);
  const extraToCollect = depositAmount !== null && retainedValid ? Math.max(0, round2(retainedRaw - depositAmount)) : 0;

  const actionable = ret.status === 'SIN_DANOS' || ret.status === 'CON_DANOS';
  const alreadyResolved = ret.status === 'CIERRE_FINANCIERO' || ret.status === 'CERRADA';
  const grave = hasGraveDamage(damages);
  const elapsed = hoursSince(ret.receivedAt);
  const remaining = elapsed === null ? null : Math.ceil(GUARANTEE_WINDOW_HOURS - elapsed);
  const noRecordedDamages = ret.status === 'CON_DANOS' && !hasRecordedCharges;
  const canConfirm = actionable && (depositAmount !== null || noDeposit) && retainedValid && can('CLOSE_FINANCIAL') && !blocked;
  const money = (n: number) => (currency === 'PEN' ? formatPen(n) : `${n.toFixed(2)} ${currency}`);

  async function handleConfirm() {
    if (!context || !ret) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await closeFinancial(
        idToken,
        id,
        context.companyId,
        context.branchId,
        ret.version,
        refund,
        retained,
        extraToCollect > 0 ? `Saldo adicional a cobrar al cliente: ${extraToCollect.toFixed(2)} ${currency}` : undefined,
      );
      setRet(updated);
      setConfirmOpen(false);
      navigate(`/devoluciones/${id}/cierre`, { state: context });
    } catch (err) {
      setConfirmOpen(false);
      if (isIncidentOpenError(err)) setBlocked(true);
      setError(describeReturnError(err, 'No pudimos resolver la garantía. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReturnFlowShell
      step={5}
      title="Garantía"
      onContinue={actionable ? () => setConfirmOpen(true) : undefined}
      continueLabel={noDeposit ? 'Continuar al cierre (sin garantía)' : 'Confirmar liberación de garantía'}
      continueDisabled={!canConfirm}
      continueBusy={busy}
      errorMessage={error}
      alerts={ret.alerts}
      lateness={ret.lateness}
      latenessCharge={ret.latenessCharge}
    >
      <h1 className={styles.pageHeading}>Resolución de garantía — {ret.vehiclePlate ?? 'Vehículo'}</h1>

      <ManualLateChargePanel ret={ret} context={context} getIdToken={getIdToken} setRet={setRet} reload={reload} />

      {blocked && (
        <p className={`${styles.banner} ${styles.banner_error}`} role="alert">
          Garantía bloqueada: hay una incidencia o evaluación de daño abierta vinculada a esta devolución. Resuélvela
          antes de liberar la garantía.
        </p>
      )}

      {alreadyResolved && (
        <p className={`${styles.banner} ${styles.banner_success}`}>
          La garantía de esta devolución ya fue resuelta
          {ret.finalSettlementAmount != null ? ` (liquidación final: ${money(ret.finalSettlementAmount)})` : ''}.{' '}
          <button type="button" className={styles.textLink} onClick={() => navigate(`/devoluciones/${id}/cierre`, { state: context })}>
            Ir al cierre
          </button>
        </p>
      )}

      {!actionable && !alreadyResolved && (
        <p className={`${styles.banner} ${styles.banner_info}`}>
          La garantía se resuelve después del resultado de la inspección.{' '}
          <button type="button" className={styles.textLink} onClick={() => navigate(`/devoluciones/${id}/resultado`, { state: context })}>
            Ir a Resultado
          </button>
        </p>
      )}

      {rentalError && (
        <p className={`${styles.banner} ${styles.banner_error}`} role="alert">
          No pudimos leer la garantía del alquiler de origen. Intenta de nuevo en unos segundos.
        </p>
      )}

      {noDeposit && (
        <p className={`${styles.banner} ${styles.banner_info}`} role="status" data-testid="no-deposit-banner">
          Sin garantía (conductor de la empresa). No hay garantía que liberar ni devolver; los cargos por daños o
          paralización, si los hay, se cobran aparte.
        </p>
      )}

      {actionable && !noDeposit && depositAmount === null && !rentalError && rental && (
        <p className={`${styles.banner} ${styles.banner_warning}`}>El alquiler de origen no tiene garantía registrada.</p>
      )}

      {depositAmount !== null && (
        <section className={styles.summaryCard} aria-label="Resumen de garantía">
          <table className={styles.amountTable}>
            <tbody>
              <tr>
                <td>Garantía total</td>
                <td>{money(depositAmount)}</td>
              </tr>
              <tr>
                <td>
                  {ret.status === 'SIN_DANOS' ? 'Sin descuentos — sin daños encontrados' : 'Descuentos (daños y paralización)'}
                </td>
                <td>− {money(retained)}</td>
              </tr>
              {extraToCollect > 0 && (
                <tr>
                  <td>Saldo adicional a cobrar al cliente (excede la garantía)</td>
                  <td>{money(extraToCollect)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className={styles.summaryLine}>Monto a devolver</p>
          <p className={styles.bigAmount} aria-live="polite">
            {money(refund)}
          </p>
          {grave ? (
            <p className={styles.summaryLine}>Daño grave: el plazo normal de 24 h no aplica y el vehículo queda inmovilizado.</p>
          ) : remaining !== null ? (
            <p className={styles.summaryLine}>
              {remaining > 0
                ? `${remaining}h restantes del plazo de ${GUARANTEE_WINDOW_HOURS}h`
                : `Plazo de ${GUARANTEE_WINDOW_HOURS}h cumplido: libera la garantía de inmediato`}
            </p>
          ) : null}
        </section>
      )}

      {ret.fuelLevelAtReturn && (
        <p className={styles.summaryLine}>
          Combustible al recibir: {FUEL_LEVEL_LABELS[ret.fuelLevelAtReturn]} (el llenado por línea S/ 50.00 se descuenta solo si se
          incluye en el monto retenido).
        </p>
      )}

      <DamageLog
        damages={damages}
        charges={charges}
        zoneNames={Object.fromEntries(tariff.items.map((t) => [t.code, t.name]))}
      />

      {actionable && pendingAmount > 0 && (
        <p className={`${styles.banner} ${styles.banner_warning}`} role="status">
          Hay {pendingAmount} daño(s) técnico(s) sin monto del informe de Motrix: siguen abiertos y bloquean la liberación
          hasta registrar su monto.
        </p>
      )}

      {actionable && noRecordedDamages && !noDeposit && (
        <>
          <p className={`${styles.banner} ${styles.banner_warning}`}>
            El expediente no tiene daños valorados. Si corresponde retener algo, ingresa manualmente el monto.
          </p>
          <label className={styles.fieldLabel}>
            Monto a retener (S/)
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className={styles.input}
              value={retainedInput ?? String(computedRetained)}
              onChange={(e) => setRetainedInput(e.target.value)}
            />
          </label>
        </>
      )}

      {!can('CLOSE_FINANCIAL') && actionable && (
        <p className={styles.blockedNotice}>Solo Finanzas, Administración o Gerencia pueden resolver la garantía.</p>
      )}

      {confirmOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="guarantee-confirm-title">
          <div className={styles.modalCard}>
            <p id="guarantee-confirm-title" className={styles.modalTitle}>
              Confirmar liberación de garantía
            </p>
            {noDeposit ? (
              <p className={styles.summaryLine}>Sin garantía (conductor de la empresa): se continúa al cierre sin montos de garantía.</p>
            ) : (
            <p className={styles.summaryLine}>
              Se devolverán <strong>{money(refund)}</strong> al cliente
              {retained > 0 ? ` y se retendrán ${money(retained)}` : ''}. Esta acción es irreversible.
            </p>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.dangerButton} onClick={handleConfirm} disabled={busy}>
                {noDeposit ? 'Continuar' : `Confirmar ${money(refund)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </ReturnFlowShell>
  );
}
