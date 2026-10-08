import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import type { CandidateDetailState } from './useCandidateDetail';
import type { RecruitmentWorkContext } from './useWorkContextForRecruitment';
import styles from './RecruitmentFlow.module.css';

interface Props {
  pageTitle: string;
  candidateId: string | undefined;
  state: CandidateDetailState;
  hasCandidate: boolean;
  context: RecruitmentWorkContext | null;
  busy?: boolean;
  children: ReactNode;
}

/** Marco común de REC-05..08: cabecera, enlace de regreso a la ficha y estados de carga/error. */
export function FlowFrame({ pageTitle, candidateId, state, hasCandidate, context, busy, children }: Props) {
  const navigate = useNavigate();
  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Reclutamiento" />
      <div className={styles.content} aria-busy={busy || state === 'LOADING'}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => navigate(candidateId ? `/reclutamiento/candidatos/${candidateId}` : '/reclutamiento', { state: context ?? undefined })}
        >
          ← Volver a la ficha del candidato
        </button>
        <h1 className={styles.title}>{pageTitle}</h1>
        {state === 'LOADING' && !hasCandidate && <p className={styles.statusText}>Cargando candidato…</p>}
        {state === 'NOT_FOUND' && (
          <p className={styles.statusText} role="alert">
            No encontramos este candidato en tu empresa y sede.
          </p>
        )}
        {state === 'FORBIDDEN' && (
          <p className={styles.statusText} role="alert">
            No tienes permiso para ver este candidato.
          </p>
        )}
        {state === 'RECOVERABLE_ERROR' && !hasCandidate && (
          <p className={styles.statusText} role="alert">
            No pudimos cargar al candidato. Intenta de nuevo en unos segundos.
          </p>
        )}
        {hasCandidate && children}
      </div>
    </main>
  );
}
