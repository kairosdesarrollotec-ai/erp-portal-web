import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CandidateSummary } from './CandidateSummary';
import { ConfirmDecisionDialog } from './ConfirmDecisionDialog';
import { FlowFrame } from './FlowFrame';
import { formatDateTime } from './flow-format';
import { decideCandidate } from './recruitment-client';
import { CANDIDATE_DECISION_LABEL, type CandidateDecision } from './recruitment-domain';
import { useRecruitmentPermissions } from './recruitment-permissions';
import { useRecruitmentCommand } from './useRecruitmentCommand';
import { useCandidateDetail } from './useCandidateDetail';
import styles from './RecruitmentFlow.module.css';

/**
 * REC-06 - Decisión de contratación. Resumen de solo lectura y dos decisiones irreversibles,
 * habilitadas solo con DECIDE_CANDIDATE y mientras no exista decisión. Confirmación reforzada.
 */
export function HiringDecisionScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useCandidateDetail(id);
  const { state, candidate, context } = detail;
  const { run, saving, error, notice, setNotice, clearError } = useRecruitmentCommand(detail);
  const { can } = useRecruitmentPermissions();
  const [pending, setPending] = useState<CandidateDecision | null>(null);

  const decided = candidate?.decision != null;
  const mayDecide = can('DECIDE_CANDIDATE') && !decided;

  async function confirm(decision: CandidateDecision, notes: string) {
    if (!candidate || !id) return;
    const res = await run(
      (token, scope) => decideCandidate(token, id, candidate.version, scope, decision, notes || undefined),
      'No pudimos registrar la decisión. Intenta de nuevo.',
    );
    if (res.ok) {
      setPending(null);
      setNotice(decision === 'CONTRATADO' ? 'Contratación confirmada.' : 'Decisión registrada: no se contrata.');
      await detail.reload();
    } else if (res.stale) {
      setPending(null);
    }
  }

  return (
    <FlowFrame pageTitle="Decisión de contratación" candidateId={id} state={state} hasCandidate={!!candidate} context={context} busy={saving}>
      {candidate && (
        <>
          <div aria-live="polite">
            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}
          </div>
          {error && !pending && (
            <p className={styles.errorBanner} role="alert">
              {error}
            </p>
          )}

          <CandidateSummary candidate={candidate} showInterviews collapsibleOnMobile />

          {decided && candidate.decision ? (
            <section aria-labelledby="dec-result-title" className={styles.card}>
              <h2 id="dec-result-title" className={styles.sectionTitle}>
                Decisión tomada
              </h2>
              <p className={styles.entryText}>
                <span className={`${styles.badge} ${candidate.decision === 'CONTRATADO' ? styles.badgePositive : styles.badgeNegative}`}>
                  {CANDIDATE_DECISION_LABEL[candidate.decision]}
                </span>
                {candidate.decidedAt && <> · {formatDateTime(candidate.decidedAt)}</>}
              </p>
              {candidate.decisionNotes && <p className={styles.entryText}>{candidate.decisionNotes}</p>}
              {candidate.decision === 'CONTRATADO' && (
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => navigate(`/reclutamiento/candidatos/${id}/incorporacion`, { state: context ?? undefined })}
                  >
                    Ir a incorporación
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section aria-labelledby="dec-actions-title" className={styles.card}>
              <h2 id="dec-actions-title" className={styles.sectionTitle}>
                Decisión
              </h2>
              {!can('DECIDE_CANDIDATE') && (
                <p id="dec-readonly" className={styles.warning}>
                  Solo Gerencia o RR.HH. pueden decidir. Esta pantalla es de solo lectura para ti.
                </p>
              )}
              <p className={styles.hint}>La decisión es definitiva y no se puede deshacer.</p>
              <div className={styles.bigActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!mayDecide || saving}
                  aria-describedby={!can('DECIDE_CANDIDATE') ? 'dec-readonly' : undefined}
                  onClick={() => {
                    clearError();
                    setPending('CONTRATADO');
                  }}
                >
                  Contratar
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  disabled={!mayDecide || saving}
                  aria-describedby={!can('DECIDE_CANDIDATE') ? 'dec-readonly' : undefined}
                  onClick={() => {
                    clearError();
                    setPending('RECHAZADO');
                  }}
                >
                  No contratar
                </button>
              </div>
            </section>
          )}

          {pending && mayDecide && (
            <ConfirmDecisionDialog
              candidate={candidate}
              decision={pending}
              busy={saving}
              error={error}
              onConfirm={(notes) => void confirm(pending, notes)}
              onCancel={() => setPending(null)}
            />
          )}
        </>
      )}
    </FlowFrame>
  );
}
