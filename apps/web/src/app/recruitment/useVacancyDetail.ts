import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getVacancy, type VacancyDetail } from './recruitment-client';
import { useWorkContextForRecruitment } from './useWorkContextForRecruitment';

export type VacancyDetailState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR';

/** REC-02 - carga el detalle de la vacante (incluye la version para If-Match). */
export function useVacancyDetail() {
  const { id } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForRecruitment();
  const [state, setState] = useState<VacancyDetailState>('LOADING');
  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);

  const reload = useCallback(async () => {
    if (!context || !id) return;
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const detail = await getVacancy(idToken, id, { companyId: context.companyId, branchId: context.branchId });
      setVacancy(detail);
      setState('READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [context, id]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  return { id, state, vacancy, setVacancy, context, reload };
}
