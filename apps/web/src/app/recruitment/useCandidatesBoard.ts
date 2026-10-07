import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import {
  getVacancy,
  listCandidates,
  RecruitmentApiError,
  type CandidateResponse,
} from './recruitment-client';
import { useWorkContextForRecruitment, type RecruitmentWorkContext } from './useWorkContextForRecruitment';

export type CandidatesBoardState = 'LOADING' | 'READY' | 'FORBIDDEN' | 'RECOVERABLE_ERROR';

/** Carga los candidatos de la vacante (y su titulo, si se puede). El orden de columnas lo da la pantalla. */
export function useCandidatesBoard(): {
  state: CandidatesBoardState;
  vacancyId: string | undefined;
  vacancyTitle: string | null;
  candidates: CandidateResponse[];
  context: RecruitmentWorkContext | null;
  reload: () => Promise<void>;
  replaceCandidate: (next: CandidateResponse) => void;
  addCandidate: (next: CandidateResponse) => void;
} {
  const { id: vacancyId } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForRecruitment();
  const [state, setState] = useState<CandidatesBoardState>('LOADING');
  const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
  const [vacancyTitle, setVacancyTitle] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!context || !vacancyId) return;
    setState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const scope = { companyId: context.companyId, branchId: context.branchId };
      const [list, vacancy] = await Promise.all([
        listCandidates(idToken, vacancyId, scope),
        // El titulo es opcional: si falla, el tablero igual se muestra.
        getVacancy(idToken, vacancyId, scope).catch(() => null),
      ]);
      setCandidates(list);
      setVacancyTitle(vacancy?.title ?? null);
      setState('READY');
    } catch (err) {
      if (err instanceof RecruitmentApiError && err.status === 403) setState('FORBIDDEN');
      else setState('RECOVERABLE_ERROR');
    }
  }, [context, vacancyId]);

  const replaceCandidate = useCallback((next: CandidateResponse) => {
    setCandidates((prev) => prev.map((c) => (c.id === next.id ? next : c)));
  }, []);

  const addCandidate = useCallback((next: CandidateResponse) => {
    setCandidates((prev) => [next, ...prev.filter((c) => c.id !== next.id)]);
  }, []);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  return { state, vacancyId, vacancyTitle, candidates, context, reload, replaceCandidate, addCandidate };
}
