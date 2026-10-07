import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { getCandidate, RecruitmentApiError, type CandidateDetail } from './recruitment-client';
import { useWorkContextForRecruitment, type RecruitmentWorkContext } from './useWorkContextForRecruitment';

/** Estados de las fichas REC-04..08 (+ FORBIDDEN cuando el backend responde 403). */
export type CandidateDetailState = 'LOADING' | 'READY' | 'FORBIDDEN' | 'NOT_FOUND' | 'RECOVERABLE_ERROR';

/**
 * Carga la ficha completa de un candidato (con entrevistas e incorporacion) para
 * REC-04..REC-08. `candidate.version` es la que va en If-Match al mover de etapa o
 * decidir; tras un comando se llama a `reload()` o `replace()`.
 */
export function useCandidateDetail(candidateId: string | undefined): {
  state: CandidateDetailState;
  candidate: CandidateDetail | null;
  context: RecruitmentWorkContext | null;
  reload: () => Promise<void>;
  replace: (next: CandidateDetail) => void;
} {
  const { context, loading: contextLoading } = useWorkContextForRecruitment();
  const [state, setState] = useState<CandidateDetailState>('LOADING');
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);

  const reload = useCallback(async () => {
    if (!context || !candidateId) return;
    setState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const detail = await getCandidate(idToken, candidateId, {
        companyId: context.companyId,
        branchId: context.branchId,
      });
      setCandidate(detail);
      setState('READY');
    } catch (err) {
      if (err instanceof RecruitmentApiError && err.status === 403) setState('FORBIDDEN');
      else if (err instanceof RecruitmentApiError && err.status === 404) setState('NOT_FOUND');
      else setState('RECOVERABLE_ERROR');
    }
  }, [context, candidateId]);

  const replace = useCallback((next: CandidateDetail) => {
    setCandidate(next);
    setState('READY');
  }, []);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  return { state, candidate, context, reload, replace };
}
