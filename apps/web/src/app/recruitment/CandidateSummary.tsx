import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { CandidateDetail } from './recruitment-client';
import { CANDIDATE_STAGE_LABEL, INTERVIEW_RESULT_LABEL } from './recruitment-domain';
import { formatDateTime } from './flow-format';
import styles from './RecruitmentFlow.module.css';

interface Props {
  candidate: CandidateDetail;
  /** Incluye las entrevistas con su resultado y notas (solo lectura). */
  showInterviews?: boolean;
  /** En móvil el resumen se puede contraer. */
  collapsibleOnMobile?: boolean;
}

/** Resumen de solo lectura del candidato, compartido por REC-05..REC-08. */
export function CandidateSummary({ candidate, showInterviews = false, collapsibleOnMobile = false }: Props) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const collapsible = collapsibleOnMobile && isMobile;
  const open = collapsible ? (expanded ?? false) : true;
  const interviews = [...(candidate.interviews ?? [])].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));

  return (
    <section aria-labelledby="cand-summary-title" className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 id="cand-summary-title" className={styles.sectionTitle}>
          {candidate.fullName}
        </h2>
        {collapsible && (
          <button
            type="button"
            className={styles.toggleButton}
            aria-expanded={open}
            aria-controls="cand-summary-body"
            onClick={() => setExpanded(!open)}
          >
            {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            {open ? 'Ocultar resumen' : 'Ver resumen'}
          </button>
        )}
      </div>
      <div id="cand-summary-body" hidden={!open}>
        <dl className={styles.dataGrid}>
          <div>
            <dt>Documento</dt>
            <dd>
              {candidate.documentType} {candidate.documentNumber}
            </dd>
          </div>
          <div>
            <dt>Etapa</dt>
            <dd>{CANDIDATE_STAGE_LABEL[candidate.stage]}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{candidate.email || '—'}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{candidate.phone || '—'}</dd>
          </div>
          {candidate.salaryExpectation != null && (
            <div>
              <dt>Pretensión salarial</dt>
              <dd>S/ {candidate.salaryExpectation.toLocaleString('es-PE')}</dd>
            </div>
          )}
        </dl>
        {showInterviews && (
          <>
            <h3 className={styles.subTitle}>Entrevistas</h3>
            {interviews.length === 0 ? (
              <p className={styles.statusText}>Todavía no hay entrevistas.</p>
            ) : (
              <ul className={styles.plainList} aria-label="Entrevistas del candidato">
                {interviews.map((interview) => (
                  <li key={interview.id} className={styles.listItem}>
                    <p className={styles.entryMeta}>
                      <time dateTime={interview.scheduledAt}>{formatDateTime(interview.scheduledAt)}</time>
                      {' · '}
                      {interview.isVirtual ? 'Videollamada' : 'Presencial'}
                      {' · '}
                      <strong>{INTERVIEW_RESULT_LABEL[interview.result]}</strong>
                    </p>
                    {interview.qualitativeNotes && <p className={styles.entryText}>{interview.qualitativeNotes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
