import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { formatDateTime } from './flow-format';
import { setProbationFees, type OnboardingResponse, type RecruitmentScope } from './recruitment-client';
import type { CommandResult } from './useRecruitmentCommand';
import styles from './RecruitmentFlow.module.css';

interface Props {
  candidateId: string;
  onboarding: OnboardingResponse;
  /** EVALUATE_PROBATION + VIEW_CANDIDATE_SENSITIVE_DATA (el backend exige ambos). */
  canEdit: boolean;
  saving: boolean;
  run: <T>(
    action: (idToken: string, scope: RecruitmentScope) => Promise<T>,
    fallback: string,
  ) => Promise<CommandResult<T>>;
  onSaved: (message: string) => Promise<void> | void;
}

const money = (value: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
const amount = (raw: string): number | undefined => (raw.trim() === '' ? undefined : Number(raw));
const invalid = (value: number | undefined) => value !== undefined && (!Number.isFinite(value) || value < 0);

/**
 * REC-08 - Honorarios del periodo de prueba (dato financiero). Sin permiso de datos sensibles
 * solo se ve el candado. Se captura y se muestra el monto pactado; el sistema no calcula nada
 * (la regla de honorarios no esta documentada: ver preguntas abiertas).
 */
export function ProbationFeesCard({ candidateId, onboarding, canEdit, saving, run, onSaved }: Props) {
  const evaluated = onboarding.probationPassed != null;
  const editable = canEdit && !evaluated && !onboarding.feesRestricted;
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState(onboarding.probationMonthlyFee != null ? String(onboarding.probationMonthlyFee) : '');
  const [after, setAfter] = useState(onboarding.postProbationMonthlySalary != null ? String(onboarding.postProbationMonthlySalary) : '');
  const [notes, setNotes] = useState(onboarding.probationFeeNotes ?? '');
  const [touched, setTouched] = useState(false);

  const feeNumber = amount(fee);
  const afterNumber = amount(after);
  const feeBad = feeNumber === undefined || invalid(feeNumber);
  const afterBad = invalid(afterNumber);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (feeBad || afterBad || saving) return;
    const res = await run(
      (token, scope) =>
        setProbationFees(token, candidateId, onboarding.version, scope, {
          probationMonthlyFee: feeNumber as number,
          ...(afterNumber !== undefined ? { postProbationMonthlySalary: afterNumber } : {}),
          ...(notes.trim() ? { probationFeeNotes: notes.trim() } : {}),
        }),
      'No pudimos registrar los honorarios. Intenta de nuevo.',
    );
    if (res.ok) {
      setEditing(false);
      setTouched(false);
      await onSaved('Honorarios del periodo de prueba registrados.');
    }
  }

  return (
    <section className={styles.card} aria-labelledby="prob-fees-title">
      <h2 id="prob-fees-title" className={styles.sectionTitle}>
        Honorarios de la prueba
      </h2>
      {onboarding.feesRestricted ? (
        <p className={styles.statusText}>
          <Lock size={14} aria-hidden="true" /> Este dato requiere permiso adicional
        </p>
      ) : (
        <>
          {onboarding.probationMonthlyFee != null ? (
            <dl className={styles.dataGrid}>
              <div>
                <dt>Honorarios mensuales</dt>
                <dd>{money(onboarding.probationMonthlyFee)}</dd>
              </div>
              {onboarding.postProbationMonthlySalary != null && (
                <div>
                  <dt>Sueldo posterior a la prueba</dt>
                  <dd>{money(onboarding.postProbationMonthlySalary)}</dd>
                </div>
              )}
              {onboarding.probationFeeNotes && (
                <div className={styles.wide}>
                  <dt>Jornada / notas</dt>
                  <dd>{onboarding.probationFeeNotes}</dd>
                </div>
              )}
              {onboarding.probationFeesRecordedAt && (
                <div>
                  <dt>Registrado</dt>
                  <dd>{formatDateTime(onboarding.probationFeesRecordedAt)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className={styles.statusText}>Todavía no se registraron los honorarios de la prueba.</p>
          )}
          {evaluated && <p className={styles.hint}>La prueba ya fue evaluada: los honorarios no se pueden modificar.</p>}
          {editable && !editing && (
            <div className={styles.rowActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setEditing(true)}>
                {onboarding.probationMonthlyFee != null ? 'Editar honorarios' : 'Registrar honorarios'}
              </button>
            </div>
          )}
          {editable && editing && (
            <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate aria-label="Honorarios de la prueba">
              <label className={styles.fieldLabel} htmlFor="fee-monthly">Honorarios mensuales (S/)</label>
              <input id="fee-monthly" className={styles.input} type="number" min="0" step="any" value={fee}
                onChange={(e) => setFee(e.target.value)} aria-required="true" aria-invalid={touched && feeBad} disabled={saving} />
              {touched && feeBad && <p className={styles.hint} role="alert">Indica los honorarios mensuales (monto válido).</p>}
              <label className={styles.fieldLabel} htmlFor="fee-after">Sueldo posterior a la prueba (S/, opcional)</label>
              <input id="fee-after" className={styles.input} type="number" min="0" step="any" value={after}
                onChange={(e) => setAfter(e.target.value)} aria-invalid={touched && afterBad} disabled={saving} />
              {touched && afterBad && <p className={styles.hint} role="alert">Indica un monto válido.</p>}
              <label className={styles.fieldLabel} htmlFor="fee-notes">Jornada o notas (opcional)</label>
              <input id="fee-notes" className={styles.input} value={notes} maxLength={500}
                onChange={(e) => setNotes(e.target.value)} disabled={saving} />
              <div className={styles.rowActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setEditing(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar honorarios'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
