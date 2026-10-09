import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listEmployees, type EmployeeResponse } from './hr-client';
import type { EmployeeStatus } from './hr-domain';
import { useWorkContextForHr } from './useWorkContextForHr';

/** ADP-01 - estados READY/LOADING/EMPTY (+ error recuperable). */
export type EmployeesListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export const PAGE_SIZE = 20;

export function useEmployeesList() {
  const { context, loading: contextLoading } = useWorkContextForHr();
  const [state, setState] = useState<EmployeesListState>('LOADING');
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [areaId, setAreaId] = useState('');
  const [status, setStatus] = useState<EmployeeStatus | ''>('');
  const [search, setSearch] = useState('');
  /** Areas vistas hasta ahora (el contrato no tiene catalogo de areas): id -> nombre. */
  const [areas, setAreas] = useState<Record<string, string>>({});
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (offset: number) => {
      if (!context) return null;
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('sin sesión');
      const idToken = await user.getIdToken();
      return listEmployees(
        idToken,
        { companyId: context.companyId, branchId: context.branchId },
        { areaId: areaId || undefined, status: status || undefined, search: search.trim() || undefined, limit: PAGE_SIZE, offset },
      );
    },
    [context, areaId, status, search],
  );

  const reload = useCallback(async () => {
    if (!context) return;
    setState('LOADING');
    try {
      const page = await fetchPage(0);
      if (!page) return;
      setEmployees(page.items);
      setTotal(page.total);
      setAreas((prev) => ({ ...prev, ...Object.fromEntries(page.items.map((e) => [e.areaId, e.areaName])) }));
      setState(page.items.length === 0 ? 'EMPTY' : 'READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [context, fetchPage]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const page = await fetchPage(employees.length);
      if (!page) return;
      setEmployees((prev) => [...prev, ...page.items]);
      setTotal(page.total);
      setAreas((prev) => ({ ...prev, ...Object.fromEntries(page.items.map((e) => [e.areaId, e.areaName])) }));
    } catch {
      setState('RECOVERABLE_ERROR');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, employees.length]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  return {
    state,
    employees,
    total,
    context,
    reload,
    areaId,
    setAreaId,
    status,
    setStatus,
    search,
    setSearch,
    areas,
    hasMore: employees.length < total,
    loadingMore,
    loadMore,
  };
}
