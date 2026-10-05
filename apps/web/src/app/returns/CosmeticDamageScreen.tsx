import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';
import { returnFlowGuard } from './ReturnGuards';
import { useReturnFlow } from './useReturnFlow';
import { DamageLog } from './DamageLog';
import { CustomerAcceptsCostField } from './CustomerAcceptsCostField';
import { CustomerRiskBadge } from './CustomerRiskBadge';
import { useCosmeticTariff } from './useCosmeticTariff';
import { formatPen } from './return-financial';
import { assessDamage, type CustomerRiskStatus } from './returns-client';
import { describeReturnError, isStaleReturnError } from './return-errors';
import { loadDamageSelection, saveDamageSelection } from './return-session-draft';
import { useReturnPermissions } from './return-permissions';
import type { DamageSeverity } from './return-status';
import styles from './ReturnForms.module.css';

/**
 * DEV-07 - Dano estetico: monto fijo del tarifario oficial por paño (BDD
 * 9.6.1). El tarifario se consulta al backend (GET /returns/cosmetic-tariff);
 * el monto sale SIEMPRE de el (no se escribe a mano) y el backend lo fija
 * (422 UNKNOWN_COSMETIC_ZONE si el codigo no existe). Los danos registrados
 * salen del expediente (ret.damages), no de la sesion.
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-07-DANO-ESTETICO-DEV-0456.
 */
export function CosmeticDamageScreen() {
  const { id, state, ret, context, getIdToken, refresh } = useReturnFlow();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const [zoneCode, setZoneCode] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState(() => loadDamageSelection(id));
  const [lastRisk, setLastRisk] = useState<CustomerRiskStatus | null>(null);
  const tariff = useCosmeticTariff(context, getIdToken);

  const guard = returnFlowGuard({ state, hasReturn: Boolean(ret) });
  if (guard || !ret) return guard;

  const severity: DamageSeverity | '' = selection.severity;
  const item = tariff.items.find((t) => t.code === zoneCode);
  const zoneNames = Object.fromEntries(tariff.items.map((t) => [t.code, t.name]));
  const aestheticDamages = ret.damages.filter((d) => d.origin === 'AESTHETIC');
  const wrongState = ret.status !== 'CON_DANOS';
  const needsAcceptance = severity !== '' && severity !== 'GRAVE';
  const acceptanceMissing = needsAcceptance && selection.customerAcceptsCost === null;
  const risk = lastRisk ?? ret.damages.at(-1)?.customerRiskStatus ?? null;

  function chooseAcceptance(value: boolean) {
    const next = { ...selection, customerAcceptsCost: value };
    setSelection(next);
    saveDamageSelection(id, next);
  }

  async function handleRegister() {
    if (!context || !ret || !item || severity === '') return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const damage = await assessDamage(idToken, id, context.companyId, context.branchId, ret.version, {
        origin: 'AESTHETIC',
        severity,
        damagedZone: item.code,
        description: description.trim() || undefined,
        ...(needsAcceptance && selection.customerAcceptsCost !== null
          ? { customerAcceptsCost: selection.customerAcceptsCost }
          : {}),
      });
      setLastRisk(damage.customerRiskStatus ?? null);
      setZoneCode('');
      setDescription('');
      await refresh();
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos registrar el daño. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReturnFlowShell
      step={4}
      title="Daño estético"
      onContinue={() => navigate(`/devoluciones/${id}/garantia`, { state: context })}
      continueLabel="Continuar a garantía"
      continueDisabled={aestheticDamages.length === 0}
      errorMessage={error}
    >
      <h1 className={styles.pageHeading}>Daño estético — {ret.vehiclePlate ?? 'Vehículo'}</h1>
      <p className={styles.pageSubtitle}>Monto según el tarifario oficial por paño (carrocería).</p>

      {severity === '' && (
        <p className={`${styles.banner} ${styles.banner_warning}`}>
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
        <legend>Paño o componente dañado</legend>
        {tariff.error && (
          <p className={`${styles.banner} ${styles.banner_error}`} role="alert">
            No pudimos cargar el tarifario oficial.{' '}
            <button type="button" className={styles.textLink} onClick={tariff.retry}>
              Reintentar
            </button>
          </p>
        )}
        <label className={styles.fieldLabel}>
          Paño del tarifario
          <select
            className={styles.select}
            value={zoneCode}
            onChange={(e) => setZoneCode(e.target.value)}
            disabled={tariff.loading}
          >
            <option value="">{tariff.loading ? 'Cargando tarifario…' : 'Selecciona…'}</option>
            {tariff.items.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name} — {formatPen(t.pricePen)}
              </option>
            ))}
          </select>
        </label>
        {item && (
          <p className={styles.bigAmount} aria-live="polite">
            Monto del tarifario: {formatPen(item.pricePen)}
          </p>
        )}
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
            disabled={!item || acceptanceMissing || busy || !can('ASSESS_DAMAGE')}
            onClick={handleRegister}
          >
            {busy ? 'Registrando…' : 'Registrar daño estético'}
          </button>
        </div>
      </fieldset>

      {!can('ASSESS_DAMAGE') && <p className={styles.blockedNotice}>Solo Administración o Gerencia pueden evaluar daños.</p>}

      {risk && (
        <p className={styles.summaryLine} aria-live="polite">
          <CustomerRiskBadge status={risk} />
        </p>
      )}

      <DamageLog damages={ret.damages} charges={ret.immobilizationCharges} zoneNames={zoneNames} />
    </ReturnFlowShell>
  );
}
