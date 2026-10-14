import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';
import { returnFlowGuard } from './ReturnGuards';
import { useReturnFlow } from './useReturnFlow';
import {
  registerReturnAlcoholTest,
  resolveAlcoholEscalation,
  type AlcoholEscalationDecision,
  type ReturnAlcoholTestResult,
} from './returns-client';
import { describeReturnError, isStaleReturnError } from './return-errors';
import { ALCOHOL_RESULT_LABELS } from './return-status';
import { useReturnPermissions } from './return-permissions';
import styles from './ReturnForms.module.css';
import { formatLimaDateTime } from '../shared/lima-time';

const OPTIONS: ReturnAlcoholTestResult[] = ['FAVORABLE', 'DESFAVORABLE', 'RECHAZADO'];

const DECISION_LABELS: Record<AlcoholEscalationDecision, string> = {
  CONTINUE_TO_INSPECTION: 'Continuar a la inspección',
  KEEP_IN_CUSTODY: 'Mantener el vehículo en custodia de VeloxRent',
};
const MIN_DECISION_NOTES = 5;

/** Textos de las opciones segun PROTO-DEV-03-* (titulo + descripcion bajo el radio). */
const OPTION_COPY: Record<ReturnAlcoholTestResult, { title: string; description: string }> = {
  FAVORABLE: {
    title: 'Favorable — puede continuar',
    description: 'Prueba negativa (0.00 g/l). Habilita el inicio inmediato de la inspección técnica vehicular 360° en patio.',
  },
  DESFAVORABLE: {
    title: 'Desfavorable — no puede continuar normalmente',
    description: 'Detección positiva de alcohol. Se bloquea la entrega normal de la unidad y se deriva a Gerencia.',
  },
  RECHAZADO: {
    title: 'Se negó a realizar la prueba',
    description: 'El conductor rechaza la prueba. Requiere acta de negativa y se deriva a Gerencia.',
  },
};

/**
 * DEV-03 - Alcolimetro de devolucion (BR-DEV-005). Favorable continua al
 * checklist (INSPECCION). Desfavorable/rechazado: el vehiculo queda en
 * recepcion provisional bajo custodia y se deriva a Gerencia (el backend
 * responde 200): Gerencia decide con resolve-alcohol-escalation (continuar a
 * inspeccion o mantener en custodia, y si marca al cliente en rojo); el resto
 * de los roles ve "Pendiente de decision de Gerencia".
 *
 * La pantalla/formulario de decision de Gerencia NO tiene prototipo Stitch
 * aprobado: se construyo con los componentes del sistema (pendiente de prototipo).
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-03-RECEPCION-DEV-0456, PROTO-DEV-03-DESFAVORABLE.
 */
export function AlcoholTestScreen() {
  const { id, state, ret, context, getIdToken, setRet, reload } = useReturnFlow();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const [result, setResult] = useState<ReturnAlcoholTestResult | ''>('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<AlcoholEscalationDecision | ''>('');
  const [markRed, setMarkRed] = useState(true); // sugerido por BR-DEV-005
  const [decisionNotes, setDecisionNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const guard = returnFlowGuard({ state, hasReturn: Boolean(ret) });
  if (guard || !ret) return guard;

  const alreadyEscalated =
    ret.status === 'RECEPCION_PROVISIONAL' && (ret.alcoholTestResult === 'DESFAVORABLE' || ret.alcoholTestResult === 'RECHAZADO');
  const unfavorableSelected = result === 'DESFAVORABLE' || result === 'RECHAZADO';
  const wrongState = ret.status !== 'RECEPCION_PROVISIONAL';
  const canDecide = can('RESOLVE_ALCOHOL_ESCALATION');
  const previous = ret.alcoholEscalation ?? null;
  const decisionValid = decision !== '' && decisionNotes.trim().length >= MIN_DECISION_NOTES;

  async function handleSubmit() {
    if (!context || !ret || result === '') return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await registerReturnAlcoholTest(
        idToken,
        id,
        context.companyId,
        context.branchId,
        ret.version,
        result,
        notes.trim() || undefined,
      );
      setRet(updated);
      if (updated.status === 'INSPECCION') {
        navigate(`/devoluciones/${id}/checklist`, { state: context });
      }
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos registrar la prueba. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve() {
    if (!context || !ret || decision === '') return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await resolveAlcoholEscalation(idToken, id, context.companyId, context.branchId, ret.version, {
        decision,
        markCustomerRed: markRed,
        notes: decisionNotes.trim(),
      });
      setRet(updated);
      setConfirmOpen(false);
      if (updated.status === 'INSPECCION') {
        navigate(`/devoluciones/${id}/checklist`, { state: context });
      } else {
        setDecision('');
        setDecisionNotes('');
      }
    } catch (err) {
      setConfirmOpen(false);
      setError(describeReturnError(err, 'No pudimos registrar la decisión de Gerencia. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  const escalatedForManager = alreadyEscalated && canDecide;

  return (
    <ReturnFlowShell
      step={2}
      title="Alcoholímetro"
      onContinue={
        escalatedForManager ? () => setConfirmOpen(true) : wrongState || alreadyEscalated ? undefined : handleSubmit
      }
      continueLabel={
        escalatedForManager
          ? 'Registrar decisión de Gerencia'
          : unfavorableSelected
            ? 'Derivar a Gerencia'
            : result === 'FAVORABLE'
              ? 'Continuar al checklist'
              : 'Registrar y continuar'
      }
      continueDisabled={
        escalatedForManager ? !decisionValid : result === '' || !can('REGISTER_ALCOHOL_TEST') || alreadyEscalated
      }
      continueBusy={busy}
      errorMessage={error}
    >
      <h1 className={styles.pageHeading}>Alcoholímetro de devolución</h1>
      <p className={styles.pageSubtitle}>
        {ret.vehiclePlate ?? 'Vehículo'} · {ret.customerName ?? 'Cliente'}
      </p>

      {(alreadyEscalated || unfavorableSelected) && (
        <p className={`${styles.banner} ${styles.banner_error}`} role="alert">
          El vehículo queda en recepción provisional bajo custodia — se deriva a Gerencia para decisión. El cliente queda
          como candidato a “rojo”.
        </p>
      )}

      {alreadyEscalated && (
        <section className={styles.reviewSection} aria-label="Decisión de Gerencia">
          <p className={styles.reviewSectionTitle}>Decisión de Gerencia</p>
          {previous && (
            <p className={styles.summaryLine}>
              Decisión previa: {DECISION_LABELS[previous.decision]} · cliente {previous.markCustomerRed ? 'marcado en rojo' : 'sin marcar en rojo'}{' '}
              · {formatLimaDateTime(previous.decidedAt)}. Motivo: {previous.notes}
            </p>
          )}
          {!canDecide && (
            <p className={`${styles.banner} ${styles.banner_warning}`} role="status">
              Pendiente de decisión de Gerencia
            </p>
          )}
          {canDecide && (
            <>
              <fieldset className={styles.fieldset} disabled={busy}>
                <legend>Decisión</legend>
                <div className={styles.radioRow}>
                  {(Object.keys(DECISION_LABELS) as AlcoholEscalationDecision[]).map((option) => (
                    <label key={option} className={styles.radioOption}>
                      <input
                        type="radio"
                        name="alcohol-decision"
                        value={option}
                        checked={decision === option}
                        onChange={() => setDecision(option)}
                      />
                      {DECISION_LABELS[option]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={markRed} onChange={(e) => setMarkRed(e.target.checked)} />
                Marcar cliente como rojo
              </label>
              <p className={styles.summaryLine}>Sugerido por la regla BR-DEV-005 ante un alcolímetro desfavorable.</p>
              <label className={styles.fieldLabel}>
                Motivo de la decisión (obligatorio, mínimo {MIN_DECISION_NOTES} caracteres)
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                />
              </label>
            </>
          )}
        </section>
      )}

      {confirmOpen && decision !== '' && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="alcohol-decision-title">
          <div className={styles.modalCard}>
            <p id="alcohol-decision-title" className={styles.modalTitle}>
              Confirmar decisión de Gerencia
            </p>
            <p className={styles.summaryLine}>
              {DECISION_LABELS[decision]}. El cliente {markRed ? 'será marcado en rojo' : 'no será marcado en rojo'}. Esta
              decisión queda registrada con tu usuario.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.dangerButton} onClick={handleResolve} disabled={busy}>
                Confirmar decisión
              </button>
            </div>
          </div>
        </div>
      )}

      {alreadyEscalated ? (
        <p className={styles.summaryLine}>
          Resultado registrado: {ret.alcoholTestResult ? ALCOHOL_RESULT_LABELS[ret.alcoholTestResult] : '—'}
          {ret.alcoholTestNotes ? ` · ${ret.alcoholTestNotes}` : ''}
        </p>
      ) : wrongState ? (
        <p className={`${styles.banner} ${styles.banner_info}`}>
          La prueba ya fue registrada para este expediente
          {ret.alcoholTestResult ? ` (${ALCOHOL_RESULT_LABELS[ret.alcoholTestResult]})` : ''}.{' '}
          <button
            type="button"
            className={styles.textLink}
            onClick={() => navigate(`/devoluciones/${id}/checklist`, { state: context })}
          >
            Ir al checklist
          </button>
        </p>
      ) : (
        <>
          <fieldset className={styles.fieldset}>
            <legend>Resultado de la prueba</legend>
            <div className={styles.radioColumn}>
              {OPTIONS.map((option) => (
                <div key={option} className={styles.radioCard}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="alcohol-result"
                      value={option}
                      checked={result === option}
                      onChange={() => setResult(option)}
                      aria-describedby={`alcohol-desc-${option}`}
                    />
                    {OPTION_COPY[option].title}
                  </label>
                  <p id={`alcohol-desc-${option}`} className={styles.radioDescription}>
                    {OPTION_COPY[option].description}
                  </p>
                </div>
              ))}
            </div>
          </fieldset>

          <label className={styles.fieldLabel}>
            Observaciones
            <textarea className={styles.textarea} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </>
      )}
    </ReturnFlowShell>
  );
}
