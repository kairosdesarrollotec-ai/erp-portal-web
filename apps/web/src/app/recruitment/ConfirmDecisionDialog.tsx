import { useState, type FormEvent } from 'react';
import { RecruitmentDialog } from './RecruitmentDialog';
import { CANDIDATE_DECISION_LABEL, INTERVIEW_RESULT_LABEL, type CandidateDecision } from './recruitment-domain';
import type { CandidateDetail } from './recruitment-client';
import { formatDateTime } from './flow-format';
import styles from './RecruitmentDialog.module.css';

interface Props {
  candidate: CandidateDetail;
  decision: CandidateDecision;
  busy: boolean;
  error: string | null;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
}

/** Confirmación reforzada de una decisión irreversible (REC-06). */
export function ConfirmDecisionDialog({ candidate, decision, busy, error, onConfirm, onCancel }: Props) {
  const [notes, setNotes] = useState('');
  const hire = decision === 'CONTRATADO';
  const interviews = [...(candidate.interviews ?? [])].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  const last = interviews[0];

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy) onConfirm(notes.trim());
  }

  return (
    <RecruitmentDialog
      titleId="decision-dialog-title"
      title={hire ? `¿Confirmar contratación de ${candidate.fullName}?` : `¿Confirmar que no se contrata a ${candidate.fullName}?`}
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <form onSubmit={submit} noValidate>
        <div className={styles.summary}>
          <p>
            <strong>{candidate.fullName}</strong> · {candidate.documentType} {candidate.documentNumber}
          </p>
          <p>Entrevistas realizadas: {interviews.filter((i) => i.result !== 'PENDIENTE').length} de {interviews.length}</p>
          {last && (
            <p>
              Última entrevista ({formatDateTime(last.scheduledAt)}): {INTERVIEW_RESULT_LABEL[last.result]}
            </p>
          )}
          <p>Decisión: {CANDIDATE_DECISION_LABEL[decision]}</p>
        </div>
        <p className={styles.consequence}>
          {hire
            ? 'Esta decisión no se puede deshacer. La persona pasará a incorporación y su ingreso se propondrá para el día siguiente.'
            : 'Esta decisión no se puede deshacer. El candidato queda descartado para esta vacante y no podrá incorporarse.'}
        </p>
        <div className={styles.field}>
          <label htmlFor="decision-notes">Notas de la decisión (opcional)</label>
          <textarea
            id="decision-notes"
            className={styles.input}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
          />
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className={hire ? styles.primaryButton : styles.dangerButton} disabled={busy}>
            {busy ? 'Guardando…' : hire ? 'Confirmar contratación' : 'Confirmar que no se contrata'}
          </button>
        </div>
      </form>
    </RecruitmentDialog>
  );
}
