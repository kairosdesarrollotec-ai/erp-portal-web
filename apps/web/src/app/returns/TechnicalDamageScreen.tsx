import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';
import { returnFlowGuard } from './ReturnGuards';
import { useReturnFlow } from './useReturnFlow';
import { DamageLog } from './DamageLog';
import { CustomerAcceptsCostField } from './CustomerAcceptsCostField';
import { CustomerRiskBadge } from './CustomerRiskBadge';
import { formatPen } from './return-financial';
import { assessDamage, chargeImmobilization, type CustomerRiskStatus } from './returns-client';
import { describeReturnError, isStaleReturnError } from './return-errors';
import { loadDamageSelection, saveDamageSelection } from './return-session-draft';
import { GUARANTEE_WINDOW_HOURS, hoursSince, type DamageSeverity } from './return-status';
import { useReturnPermissions } from './return-permissions';
import styles from './ReturnForms.module.css';

/**
 * DEV-08 - Dano tecnico (derivacion a Motrix) y cargo por paralizacion.
 * No existe tarifario para danos tecnicos (BR-DEV-006): el monto y la
 * referencia vienen SIEMPRE del informe externo de Motrix. El cargo por
 * paralizacion (BR-DEV-011) solo aplica pasadas 24 h naturales desde la
 * recepcion; el backend lo valida (422 IMMOBILIZATION_PERIOD_NOT_ELAPSED) y
 * aplica la tarifa diaria del vehiculo (no se digita). Danos y cargos salen
 * del expediente (ret.damages / ret.immobilizationCharges).
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-08-DANO-TECNICO-DEV-0456, PROTO-DEV-08-CARGO-POR-PARALIZACION-24H.
 */
export function TechnicalDamageScreen() {
  const { id, state, ret, context, getIdToken, refresh } = useReturnFlow();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const [reportRef, setReportRef] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState('');
  const [selection, setSelection] = useState(() => loadDamageSelection(id));
  const [lastRisk, setLastRisk] = useState<CustomerRiskStatus | null>(null);
  const [busy, setBusy] = useState<'damage' | 'charge' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const guard = returnFlowGuard({ state, hasReturn: Boolean(ret) });
  if (guard || !ret) return guard;

  const severity: DamageSeverity | '' = selection.severity;
  const technicalDamages = ret.damages.filter((d) => d.origin === 'TECHNICAL');
  const lastTechnical = technicalDamages[technicalDamages.length - 1];
  const needsAcceptance = severity !== '' && severity !== 'GRAVE';
  const acceptanceMissing = needsAcceptance && selection.customerAcceptsCost === null;
  const risk = lastRisk ?? lastTechnical?.customerRiskStatus ?? null;
  const lastCharge = ret.immobilizationCharges.at(-1);
  const wrongState = ret.status !== 'CON_DANOS' && ret.status !== 'CIERRE_FINANCIERO';
  const amountValue = Number(amount);
  const amountValid = amount.trim() !== '' && Number.isFinite(amountValue) && amountValue >= 0;

  const elapsed = hoursSince(ret.receivedAt);
  const chargeEligible = elapsed !== null && elapsed > GUARANTEE_WINDOW_HOURS;
  const suggestedDays = elapsed !== null && elapsed > GUARANTEE_WINDOW_HOURS ? Math.max(1, Math.ceil((elapsed - 24) / 24)) : 1;
  const daysValue = Number(days === '' ? suggestedDays : days);
  const chargeValid = Number.isInteger(daysValue) && daysValue >= 1;

  function chooseAcceptance(value: boolean) {
    const next = { ...selection, customerAcceptsCost: value };
    setSelection(next);
    saveDamageSelection(id, next);
  }

  async function handleRegisterDamage() {
    if (!context || !ret || severity === '') return;
    setBusy('damage');
    setError(null);
    try {
      const idToken = await getIdToken();
      const damage = await assessDamage(idToken, id, context.companyId, context.branchId, ret.version, {
        origin: 'TECHNICAL',
        severity,
        externalReportReference: reportRef.trim(),
        estimatedAmount: amountValue,
        description: description.trim() || undefined,
        ...(needsAcceptance && selection.customerAcceptsCost !== null
          ? { customerAcceptsCost: selection.customerAcceptsCost }
          : {}),
      });
      setLastRisk(damage.customerRiskStatus ?? null);
      setReportRef('');
      setAmount('');
      setDescription('');
      await refresh();
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos registrar el daño técnico. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleCharge() {
    if (!context || !ret || !chargeValid) return;
    setBusy('charge');
    setError(null);
    try {
      const idToken = await getIdToken();
      await chargeImmobilization(idToken, id, context.companyId, context.branchId, ret.version, {
        damageId: lastTechnical?.id,
        daysCharged: daysValue,
      });
      setDays('');
      await refresh();
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos aplicar el cargo por paralización. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ReturnFlowShell
      step={4}
      title="Daño técnico"
      onContinue={() => navigate(`/devoluciones/${id}/garantia`, { state: context })}
      continueLabel="Continuar a garantía"
      continueDisabled={technicalDamages.length === 0}
      errorMessage={error}
    >
      <h1 className={styles.pageHeading}>Daño técnico — {ret.vehiclePlate ?? 'Vehículo'}</h1>
      <p className={`${styles.banner} ${styles.banner_warning}`}>
        Daño técnico en evaluación externa: no existe precio fijo. El vehículo se deriva a Motrix y aquí se registra la
        referencia y el monto de su informe.
      </p>

      {severity === '' && (
        <p className={`${styles.banner} ${styles.banner_error}`}>
          Primero clasifica la gravedad.{' '}
          <button type="button" className={styles.textLink} onClick={() => navigate(`/devoluciones/${id}/dano`, { state: context })}>
            Ir a la clasificación
          </button>
        </p>
      )}
      {wrongState && (
        <p className={`${styles.banner} ${styles.banner_info}`}>La devolución ya no admite nuevas valoraciones de daño.</p>
      )}

      <fieldset className={styles.fieldset} disabled={wrongState || severity === ''}>
        <legend>Informe de Motrix</legend>
        <label className={styles.fieldLabel}>
          Referencia del informe
          <input className={styles.input} value={reportRef} onChange={(e) => setReportRef(e.target.value)} />
        </label>
        <label className={styles.fieldLabel}>
          Monto del informe (S/)
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className={styles.input}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className={styles.fieldLabel}>
          Descripción del daño
          <textarea className={styles.textarea} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {needsAcceptance && (
          <CustomerAcceptsCostField value={selection.customerAcceptsCost} onChange={chooseAcceptance} />
        )}
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.accentButton}
            disabled={!reportRef.trim() || !amountValid || acceptanceMissing || busy !== null || !can('ASSESS_DAMAGE')}
            onClick={handleRegisterDamage}
          >
            {busy === 'damage' ? 'Registrando…' : 'Registrar daño técnico'}
          </button>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset} disabled={wrongState}>
        <legend>Cargo por paralización (24 h)</legend>
        {elapsed === null ? (
          <p className={styles.summaryLine}>Sin fecha de recepción registrada.</p>
        ) : chargeEligible ? (
          <p className={`${styles.banner} ${styles.banner_warning}`} role="status">
            Han pasado {Math.floor(elapsed)} h desde la recepción: los días de paralización se cobran como alquiler
            adicional, sumados al monto del daño.
          </p>
        ) : (
          <p className={styles.summaryLine} role="status">
            Aún no corresponde: faltan {Math.max(0, Math.ceil(GUARANTEE_WINDOW_HOURS - elapsed))} h para cumplir 24 h
            naturales desde la recepción.
          </p>
        )}
        <label className={styles.fieldLabel}>
          Días a cobrar
          <input
            type="number"
            min="1"
            step="1"
            className={styles.input}
            value={days === '' ? String(suggestedDays) : days}
            onChange={(e) => setDays(e.target.value)}
          />
        </label>
        <p className={styles.summaryLine}>
          La tarifa diaria la aplica el sistema según el vehículo; el total se muestra al registrar el cargo.
        </p>
        {lastCharge && (
          <p className={styles.summaryLine} role="status">
            Último cargo: {lastCharge.daysCharged} día(s) × {formatPen(lastCharge.dailyRate)} = {formatPen(lastCharge.totalAmount)}
          </p>
        )}
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!chargeEligible || !chargeValid || busy !== null || !can('CHARGE_IMMOBILIZATION')}
            onClick={handleCharge}
          >
            {busy === 'charge' ? 'Aplicando…' : 'Aplicar cargo por paralización'}
          </button>
          <button type="button" className={styles.textLink} onClick={() => setTick((t) => t + 1)}>
            Actualizar horas transcurridas
          </button>
        </div>
      </fieldset>

      {risk && (
        <p className={styles.summaryLine} aria-live="polite">
          <CustomerRiskBadge status={risk} />
        </p>
      )}

      <DamageLog damages={ret.damages} charges={ret.immobilizationCharges} />
    </ReturnFlowShell>
  );
}
