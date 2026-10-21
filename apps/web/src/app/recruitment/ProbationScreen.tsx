import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CandidateSummary } from './CandidateSummary';
import { ProbationFeesCard } from './ProbationFeesCard';
import { FlowFrame } from './FlowFrame';
import { formatDate, formatDateTime } from './flow-format';
import { RecruitmentDialog } from './RecruitmentDialog';
import { evaluateProbation } from './recruitment-client';
import { probationDaysRemaining } from './recruitment-domain';
import { useRecruitmentPermissions } from './recruitment-permissions';
import { useRecruitmentCommand, useUnsavedWarning } from './useRecruitmentCommand';
import { useCandidateDetail } from './useCandidateDetail';
import styles from './RecruitmentFlow.module.css';
import dialogStyles from './RecruitmentDialog.module.css';

/**
 * REC-08 - Periodo de prueba. Evaluación del mes 3 (EVALUATE_PROBATION): positiva pasa a
 * planilla en el mes 4 (el propio comando lo hace), negativa termina la relación.
 * Decisión: si aún no se cumplen los 3 meses (EXTERNAL_DEPENDENCY_PENDING) se permite
 * evaluar, porque el servidor no lo impide, pero se avisa los días que faltan y se pide
 * una confirmación extra. Honorarios: tarjeta propia, solo con permiso de datos sensibles.
 */
export function ProbationScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useCandidateDetail(id);
  const { state, candidate, context } = detail;
  const { run, saving, error, notice, setNotice, clearError } = useRecruitmentCommand(detail);
  const { can } = useRecruitmentPermissions();

  const [text, setText] = useState('');
  const [pending, setPending] = useState<boolean | null>(null);
  const [early, setEarly] = useState(false);

  const onboarding = candidate?.onboarding?.isCompleted ? candidate.onboarding : null;
  const evaluated = onboarding?.probationPassed != null;
  const passed = onboarding?.probationPassed === true;
  const daysLeft = onboarding ? probationDaysRemaining(onboarding.startDate) : 0;
  const notDue = daysLeft > 0;
  const canEvaluate = can('EVALUATE_PROBATION') && !!onboarding && !evaluated;
  const trimmed = text.trim();

  useUnsavedWarning(canEvaluate && trimmed.length > 0);

  function open(result: boolean) {
    clearError();
    setEarly(false);
    setPending(result);
  }

  async function confirm() {
    if (!id || pending === null) return;
    if (notDue && !early) return;
    const res = await run(
      (token, scope) => evaluateProbation(token, id, scope, pending, trimmed),
      'No pudimos registrar la evaluación. Intenta de nuevo.',
    );
    if (res.ok) {
      setPending(null);
      setText('');
      setNotice(pending ? 'Evaluación positiva registrada. Pasó a planilla.' : 'Evaluación negativa registrada.');
      await detail.reload();
    } else if (res.stale) {
      setPending(null);
    }
  }

  return (
    <FlowFrame pageTitle="Periodo de prueba" candidateId={id} state={state} hasCandidate={!!candidate} context={context} busy={saving}>
      {candidate && (
        <>
          <div aria-live="polite">
            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}
          </div>
          {error && pending === null && (
            <p className={styles.errorBanner} role="alert">
              {error}
            </p>
          )}

          <CandidateSummary candidate={candidate} />

          {!onboarding ? (
            <section className={styles.card} aria-labelledby="prob-blocked-title">
              <h2 id="prob-blocked-title" className={styles.sectionTitle}>
                Periodo de prueba no disponible
              </h2>
              <p className={styles.statusText}>El periodo de prueba empieza cuando se confirma el ingreso de la persona.</p>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => navigate(`/reclutamiento/candidatos/${id}/incorporacion`, { state: context ?? undefined })}
                >
                  Ir a incorporación
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className={styles.card} aria-labelledby="prob-status-title">
                <h2 id="prob-status-title" className={styles.sectionTitle}>
                  Seguimiento
                </h2>
                <dl className={styles.dataGrid}>
                  <div>
                    <dt>Fecha de ingreso</dt>
                    <dd>{formatDate(onboarding.startDate)}</dd>
                  </div>
                  <div>
                    <dt>Evaluación programada</dt>
                    <dd>
                      {evaluated
                        ? 'Mes 3 (ya evaluada)'
                        : notDue
                          ? `Mes 3 (faltan ${daysLeft} días)`
                          : 'Mes 3 (ya se cumplieron los 3 meses)'}
                    </dd>
                  </div>
                  {evaluated && (
                    <>
                      <div>
                        <dt>Resultado</dt>
                        <dd>
                          <span className={`${styles.badge} ${passed ? styles.badgePositive : styles.badgeNegative}`}>
                            {passed ? 'Positiva' : 'Negativa'}
                          </span>
                          {onboarding.probationEvaluatedAt && <> · {formatDateTime(onboarding.probationEvaluatedAt)}</>}
                        </dd>
                      </div>
                      <div className={styles.wide}>
                        <dt>Evaluación cualitativa</dt>
                        <dd>{onboarding.probationEvaluation}</dd>
                      </div>
                    </>
                  )}
                </dl>
                {!evaluated && notDue && (
                  <p className={styles.warning}>
                    Aún no se cumplen los 3 meses: faltan {daysLeft} días. Puedes registrar la evaluación, pero se te pedirá confirmarlo.
                  </p>
                )}
              </section>

              <ProbationFeesCard
                key={`${onboarding.id}-${onboarding.version}`}
                candidateId={id as string}
                onboarding={onboarding}
                canEdit={can('EVALUATE_PROBATION') && can('VIEW_CANDIDATE_SENSITIVE_DATA')}
                saving={saving}
                run={run}
                onSaved={async (message) => {
                  setNotice(message);
                  await detail.reload();
                }}
              />

              <section className={styles.card} aria-labelledby="prob-payroll-title">
                <h2 id="prob-payroll-title" className={styles.sectionTitle}>
                  Planilla
                </h2>
                {evaluated && passed ? (
                  <>
                    <p className={styles.entryText}>
                      <span className={`${styles.badge} ${styles.badgePositive}`}>Pasó a planilla</span>
                    </p>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => navigate('/reclutamiento', { state: context ?? undefined })}
                      >
                        Volver a Reclutamiento
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button type="button" className={styles.primaryButton} disabled aria-describedby="prob-payroll-hint">
                      Pasar a planilla
                    </button>
                    <p id="prob-payroll-hint" className={styles.hint}>
                      {evaluated ? 'No aplica: la evaluación fue negativa y la relación termina.' : 'Disponible tras la evaluación del mes 3'}
                    </p>
                  </>
                )}
              </section>

              {!evaluated && can('EVALUATE_PROBATION') && (
                <section className={styles.card} aria-labelledby="prob-eval-title">
                  <h2 id="prob-eval-title" className={styles.sectionTitle}>
                    Evaluación del mes 3
                  </h2>
                  <div className={styles.form}>
                    <label className={styles.fieldLabel} htmlFor="prob-text">
                      Evaluación cualitativa
                    </label>
                    <textarea
                      id="prob-text"
                      className={styles.input}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={saving}
                      aria-required="true"
                    />
                    <div className={styles.rowActions}>
                      {can('TERMINATE_PROBATION') && (
                        <button type="button" className={styles.dangerButton} disabled={!trimmed || saving} onClick={() => open(false)}>
                          Registrar término por prueba negativa
                        </button>
                      )}
                      <button type="button" className={styles.primaryButton} disabled={!trimmed || saving} onClick={() => open(true)}>
                        Registrar evaluación positiva
                      </button>
                    </div>
                    {!can('TERMINATE_PROBATION') && (
                      <p className={styles.hint}>El término por prueba negativa lo registra Gerencia General.</p>
                    )}
                    {!trimmed && <p className={styles.hint}>Escribe la evaluación para habilitar los botones.</p>}
                  </div>
                </section>
              )}
              {!evaluated && !can('EVALUATE_PROBATION') && (
                <p className={styles.warning}>Solo el personal autorizado puede evaluar el periodo de prueba.</p>
              )}
            </>
          )}

          {pending !== null && canEvaluate && (
            <RecruitmentDialog
              titleId="prob-dialog-title"
              title={pending ? '¿Registrar evaluación positiva?' : '¿Registrar evaluación negativa?'}
              description={
                pending
                  ? 'La persona pasa a planilla en el mes 4. Esta decisión no se puede deshacer.'
                  : 'La relación laboral termina. Esta decisión no se puede deshacer.'
              }
              onClose={() => {
                if (!saving) setPending(null);
              }}
            >
              {notDue && (
                <label className={dialogStyles.check}>
                  <input type="checkbox" checked={early} onChange={(e) => setEarly(e.target.checked)} disabled={saving} />
                  Entiendo que aún no se cumplen los 3 meses (faltan {daysLeft} días) y quiero evaluar de todos modos.
                </label>
              )}
              {error && (
                <p className={dialogStyles.error} role="alert">
                  {error}
                </p>
              )}
              <div className={dialogStyles.actions}>
                <button type="button" className={dialogStyles.secondaryButton} onClick={() => setPending(null)} disabled={saving}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={pending ? dialogStyles.primaryButton : dialogStyles.dangerButton}
                  disabled={saving || (notDue && !early)}
                  onClick={() => void confirm()}
                >
                  {saving ? 'Guardando…' : pending ? 'Confirmar evaluación positiva' : 'Confirmar evaluación negativa'}
                </button>
              </div>
            </RecruitmentDialog>
          )}
        </>
      )}
    </FlowFrame>
  );
}
