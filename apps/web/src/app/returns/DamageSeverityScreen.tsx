import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';
import { returnFlowGuard } from './ReturnGuards';
import { useReturnFlow } from './useReturnFlow';
import { DamageLog } from './DamageLog';
import { CustomerAcceptsCostField } from './CustomerAcceptsCostField';
import { loadDamageSelection, saveDamageSelection } from './return-session-draft';
import { SEVERITY_LABELS, type DamageOrigin, type DamageSeverity } from './return-status';
import { useReturnPermissions } from './return-permissions';
import styles from './ReturnForms.module.css';

const SEVERITIES: { value: DamageSeverity; hint: string }[] = [
  { value: 'LEVE', hint: 'Si el cliente acepta el costo pasa a ámbar y sigue el proceso normal.' },
  { value: 'MODERADO', hint: 'Cliente observado; si no acepta el costo, va a vía legal.' },
  { value: 'GRAVE', hint: 'El cliente pasa siempre a lista roja; el plazo de 24 h no aplica.' },
];

/**
 * DEV-06 - Evaluacion de dano: clasifica origen (estetico/tecnico) y gravedad
 * (BR-DEV-007, tabla 10.3). Se llega aqui solo desde "Continuar a evaluacion
 * de dano" de DEV-05. El comando assess-damage se ejecuta en DEV-07 (estetico,
 * tarifario) o DEV-08 (tecnico, informe de Motrix), que son quienes aportan
 * el monto. La pregunta "¿El cliente acepta el costo?" (LEVE/MODERADO) afecta el
 * semaforo del cliente y viaja en assess-damage. Dano grave exige confirmacion explicita de lista roja (BR-DEV-008).
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-06-EVALUACION-DE-DANO-DEV-0456, PROTO-DEV-06-MODAL-DANO-GRAVE-LISTA-ROJA-BR-DEV-008.
 */
export function DamageSeverityScreen() {
  const { id, state, ret, context } = useReturnFlow();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const [selection, setSelection] = useState(() => loadDamageSelection(id));
  const [graveModal, setGraveModal] = useState(false);

  const guard = returnFlowGuard({ state, hasReturn: Boolean(ret) });
  if (guard || !ret) return guard;

  const wrongState = ret.status !== 'CON_DANOS';
  const needsAcceptance = selection.severity === 'LEVE' || selection.severity === 'MODERADO';
  const ready =
    selection.origin !== '' && selection.severity !== '' && (!needsAcceptance || selection.customerAcceptsCost !== null);

  function choose(patch: Partial<typeof selection>) {
    const next = { ...selection, ...patch };
    setSelection(next);
    saveDamageSelection(id, next);
  }

  function proceed() {
    if (!ready) return;
    setGraveModal(false);
    navigate(`/devoluciones/${id}/dano/${selection.origin === 'AESTHETIC' ? 'estetico' : 'tecnico'}`, { state: context });
  }

  function handleContinue() {
    if (selection.severity === 'GRAVE') setGraveModal(true);
    else proceed();
  }

  return (
    <ReturnFlowShell
      step={4}
      title="Evaluación de daño"
      onContinue={wrongState ? undefined : handleContinue}
      continueLabel="Continuar"
      continueDisabled={!ready || !can('ASSESS_DAMAGE')}
    >
      <h1 className={styles.pageHeading}>Evaluación de daño — {ret.vehiclePlate ?? 'Vehículo'}</h1>
      <p className={styles.pageSubtitle}>Clasifica el origen y la gravedad del daño encontrado.</p>

      {wrongState && (
        <p className={`${styles.banner} ${styles.banner_info}`}>
          Esta devolución no está en evaluación de daños (estado actual:{' '}
          {ret.status === 'SIN_DANOS' ? 'sin daños' : 'otro estado'}).{' '}
          <button type="button" className={styles.textLink} onClick={() => navigate(`/devoluciones/${id}/resultado`, { state: context })}>
            Volver a Resultado
          </button>
        </p>
      )}

      {!can('ASSESS_DAMAGE') && (
        <p className={styles.blockedNotice}>Solo Administración o Gerencia pueden evaluar daños.</p>
      )}

      <fieldset className={styles.fieldset} disabled={wrongState}>
        <legend>Origen del daño</legend>
        <div className={styles.optionGrid}>
          {(
            [
              ['AESTHETIC', 'Estético (carrocería)', 'Se valora con el tarifario oficial por paño.'],
              ['TECHNICAL', 'Técnico (motor, frenos, suspensión, dirección)', 'No tiene precio fijo: se deriva a Motrix.'],
            ] as [DamageOrigin, string, string][]
          ).map(([value, label, hint]) => (
            <label key={value} className={styles.optionCard}>
              <input
                type="radio"
                name="damage-origin"
                checked={selection.origin === value}
                onChange={() => choose({ origin: value })}
              />
              <span>
                {label}
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset} disabled={wrongState}>
        <legend>Gravedad</legend>
        <div className={styles.optionGrid}>
          {SEVERITIES.map(({ value, hint }) => (
            <label key={value} className={styles.optionCard}>
              <input
                type="radio"
                name="damage-severity"
                checked={selection.severity === value}
                onChange={() => choose({ severity: value })}
              />
              <span>
                {SEVERITY_LABELS[value]}
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {needsAcceptance && (
        <CustomerAcceptsCostField
          value={selection.customerAcceptsCost}
          onChange={(value) => choose({ customerAcceptsCost: value })}
          disabled={wrongState}
        />
      )}

      <DamageLog damages={ret.damages} charges={ret.immobilizationCharges} />

      {ret.damages.length > 0 && (
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigate(`/devoluciones/${id}/garantia`, { state: context })}
          >
            Ir a resolución de garantía
          </button>
        </div>
      )}

      {graveModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="grave-title">
          <div className={styles.modalCard}>
            <p id="grave-title" className={styles.modalTitle}>
              Daño grave: el cliente pasará a lista roja
            </p>
            <p className={styles.summaryLine}>
              Un daño grave marca siempre al cliente como “rojo”, el vehículo queda inmovilizado y no existe rehabilitación
              del estado (BR-DEV-007, BR-DEV-008). ¿Confirmas la clasificación como grave?
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setGraveModal(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.dangerButton} onClick={proceed}>
                Confirmar daño grave
              </button>
            </div>
          </div>
        </div>
      )}
    </ReturnFlowShell>
  );
}
