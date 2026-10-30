import { useId, useState, type FormEvent } from 'react';
import { RecruitmentDialog } from './RecruitmentDialog';
import { NEGOTIATION_OUTCOME_LABEL, type NegotiationOutcome } from './recruitment-domain';
import type { RecordNegotiationInput } from './recruitment-client';
import styles from './RecruitmentDialog.module.css';

interface Props {
  candidateName: string;
  /** Pretension registrada en la ficha; sirve de valor inicial. */
  salaryExpectation?: number | null;
  busy: boolean;
  error: string | null;
  onSubmit: (input: RecordNegotiationInput) => void;
  onCancel: () => void;
}

const OUTCOMES = Object.keys(NEGOTIATION_OUTCOME_LABEL) as NegotiationOutcome[];

const parseAmount = (raw: string): number | undefined => (raw.trim() === '' ? undefined : Number(raw));
const invalidAmount = (value: number | undefined) => value !== undefined && (!Number.isFinite(value) || value < 0);
const optionalText = (raw: string) => (raw.trim() ? { value: raw.trim() } : null);

/**
 * REC-04 - "Registrar negociacion": condiciones ofrecidas, planteadas por el candidato y
 * resultado de la ronda. Cada registro queda en el historial (y en la auditoria del back).
 * Acordada exige sueldo acordado; No acordada exige motivo (mismas reglas que el servidor).
 */
export function NegotiationDialog({ candidateName, salaryExpectation, busy, error, onSubmit, onCancel }: Props) {
  const titleId = useId();
  const [outcome, setOutcome] = useState<NegotiationOutcome>('EN_CURSO');
  const [offeredSalary, setOfferedSalary] = useState('');
  const [offeredSchedule, setOfferedSchedule] = useState('');
  const [offeredOther, setOfferedOther] = useState('');
  const [candidateSalary, setCandidateSalary] = useState(salaryExpectation != null ? String(salaryExpectation) : '');
  const [candidateSchedule, setCandidateSchedule] = useState('');
  const [candidateOther, setCandidateOther] = useState('');
  const [candidateStartDate, setCandidateStartDate] = useState('');
  const [agreedSalary, setAgreedSalary] = useState('');
  const [agreedConditions, setAgreedConditions] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const offered = parseAmount(offeredSalary);
  const cand = parseAmount(candidateSalary);
  const agreed = parseAmount(agreedSalary);
  const problems = {
    offered: offered === undefined || invalidAmount(offered),
    candidate: invalidAmount(cand),
    agreed: outcome === 'ACORDADA' && (agreed === undefined || invalidAmount(agreed)),
    reason: outcome === 'NO_ACORDADA' && !reason.trim(),
  };
  const hasProblems = problems.offered || problems.candidate || problems.agreed || problems.reason;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (hasProblems || busy) return;
    onSubmit({
      outcome,
      offeredSalary: offered as number,
      ...(optionalText(offeredSchedule) ? { offeredSchedule: offeredSchedule.trim() } : {}),
      ...(optionalText(offeredOther) ? { offeredOtherConditions: offeredOther.trim() } : {}),
      ...(cand !== undefined ? { candidateSalary: cand } : {}),
      ...(optionalText(candidateSchedule) ? { candidateSchedule: candidateSchedule.trim() } : {}),
      ...(optionalText(candidateOther) ? { candidateOtherConditions: candidateOther.trim() } : {}),
      ...(candidateStartDate ? { candidateStartDate } : {}),
      ...(outcome === 'ACORDADA' && agreed !== undefined ? { agreedSalary: agreed } : {}),
      ...(outcome === 'ACORDADA' && optionalText(agreedConditions) ? { agreedConditions: agreedConditions.trim() } : {}),
      ...(outcome === 'NO_ACORDADA' ? { reason: reason.trim() } : {}),
    });
  }

  const input = (id: string, label: string, value: string, set: (v: string) => void, extra: Record<string, unknown> = {}) => (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className={styles.line} value={value} onChange={(e) => set(e.target.value)} {...extra} />
    </div>
  );

  return (
    <RecruitmentDialog
      titleId={titleId}
      title="Registrar negociación"
      description={`Condiciones conversadas con ${candidateName}. Cada registro se guarda en el historial.`}
      onClose={onCancel}
    >
      <form onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="ng-outcome">Resultado de esta ronda</label>
          <select id="ng-outcome" className={styles.line} value={outcome} onChange={(e) => setOutcome(e.target.value as NegotiationOutcome)}>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{NEGOTIATION_OUTCOME_LABEL[o]}</option>
            ))}
          </select>
        </div>

        <fieldset className={styles.group}>
          <legend>Lo que ofrecemos</legend>
          {input('ng-offered', 'Sueldo ofrecido (S/)', offeredSalary, setOfferedSalary, {
            type: 'number', min: '0', step: 'any', 'aria-required': 'true', 'aria-invalid': touched && problems.offered,
          })}
          {touched && problems.offered && <span className={styles.error} role="alert">Indica el sueldo ofrecido (monto válido).</span>}
          {input('ng-offered-schedule', 'Horario ofrecido (opcional)', offeredSchedule, setOfferedSchedule)}
          {input('ng-offered-other', 'Otras condiciones ofrecidas, como alimentación (opcional)', offeredOther, setOfferedOther)}
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Lo que plantea el candidato</legend>
          {input('ng-cand-salary', 'Pretensión salarial (S/, opcional)', candidateSalary, setCandidateSalary, {
            type: 'number', min: '0', step: 'any', 'aria-invalid': touched && problems.candidate,
          })}
          {touched && problems.candidate && <span className={styles.error} role="alert">Indica un monto válido.</span>}
          {input('ng-cand-schedule', 'Horario solicitado (opcional)', candidateSchedule, setCandidateSchedule)}
          {input('ng-cand-other', 'Otras condiciones solicitadas (opcional)', candidateOther, setCandidateOther)}
          {input('ng-cand-start', 'Fecha de incorporación solicitada (opcional)', candidateStartDate, setCandidateStartDate, { type: 'date' })}
        </fieldset>

        {outcome === 'ACORDADA' && (
          <fieldset className={styles.group}>
            <legend>Acuerdo</legend>
            {input('ng-agreed', 'Sueldo acordado (S/)', agreedSalary, setAgreedSalary, {
              type: 'number', min: '0', step: 'any', 'aria-required': 'true', 'aria-invalid': touched && problems.agreed,
            })}
            {touched && problems.agreed && <span className={styles.error} role="alert">Indica el sueldo acordado (monto válido).</span>}
            {input('ng-agreed-cond', 'Condiciones acordadas (opcional)', agreedConditions, setAgreedConditions)}
            <p className={styles.description}>Al acordar, el candidato pasa a la etapa Entrevista si aún no la alcanzó.</p>
          </fieldset>
        )}

        {outcome === 'NO_ACORDADA' && (
          <div className={styles.field}>
            <label htmlFor="ng-reason">Motivo</label>
            <textarea id="ng-reason" className={styles.input} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)}
              aria-required="true" aria-invalid={touched && problems.reason} />
            {touched && problems.reason && <span className={styles.error} role="alert">Indica por qué no se acordó.</span>}
          </div>
        )}

        <div aria-live="polite">{error && <p className={styles.error} role="alert">{error}</p>}</div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? 'Guardando…' : 'Guardar negociación'}</button>
        </div>
      </form>
    </RecruitmentDialog>
  );
}
