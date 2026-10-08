import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listVacancies, type VacancyResponse } from './recruitment-client';
import type { VacancyStatus } from './recruitment-domain';
import { useWorkContextForRecruitment } from './useWorkContextForRecruitment';

/** REC-01 - estados READY/LOADING/EMPTY (+ error recuperable). */
export type VacanciesListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export const PAGE_SIZE = 20;

export function useVacanciesList() {
  const { context, loading: contextLoading } = useWorkContextForRecruitment();
  const [state, setState] = useState<VacanciesListState>('LOADING');
  const [vacancies, setVacancies] = useState<VacancyResponse[]>([]);
  const [status, setStatus] = useState<VacancyStatus | ''>('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = useCallback(async () => {
    if (!context) return;
    setState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const results = await listVacancies(
        idToken,
        { companyId: context.companyId, branchId: context.branchId },
        { status: status || undefined, limit: PAGE_SIZE },
      );
      setVacancies(results);
      setHasMore(results.length >= PAGE_SIZE);
      setState(results.length === 0 ? 'EMPTY' : 'READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [context, status]);

  const loadMore = useCallback(async () => {
    if (!context || vacancies.length === 0) return;
    const last = vacancies[vacancies.length - 1];
    setLoadingMore(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const next = await listVacancies(
        idToken,
        { companyId: context.companyId, branchId: context.branchId },
        { status: status || undefined, limit: PAGE_SIZE, cursor: { createdAt: last.createdAt, id: last.id } },
      );
      setVacancies((prev) => [...prev, ...next]);
      setHasMore(next.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [context, vacancies, status]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  return { state, vacancies, context, reload, status, setStatus, hasMore, loadingMore, loadMore };
}
