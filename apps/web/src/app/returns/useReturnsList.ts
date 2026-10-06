import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listReturns, ReturnResponse, ReturnStatus } from './returns-client';
import { listRentals, RentalResponse } from '../rentals/rentals-client';
import { useWorkContextForReturns } from './useWorkContextForReturns';

/** DEV-01 - estados READY/LOADING/EMPTY/RECOVERABLE_ERROR (mismo contrato que ALQ-01). */
export type ReturnsListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export const PAGE_SIZE = 20;
const FILTER_KEY = 'kairos.devoluciones.filtro';

/** DEV-01 - "Filtros conservados en sesion" (PANTALLAS-V3-B-DEVOLUCION.md, punto 15). */
export function loadStatusFilter(): ReturnStatus | '' {
  try {
    return (sessionStorage.getItem(FILTER_KEY) as ReturnStatus | null) ?? '';
  } catch {
    return '';
  }
}

function saveStatusFilter(value: ReturnStatus | ''): void {
  try {
    if (value) sessionStorage.setItem(FILTER_KEY, value);
    else sessionStorage.removeItem(FILTER_KEY);
  } catch {
    // sessionStorage puede no estar disponible - no bloquea la pantalla
  }
}

export function useReturnsList() {
  const { context, loading: contextLoading } = useWorkContextForReturns();
  const [state, setState] = useState<ReturnsListState>('LOADING');
  const [returns, setReturns] = useState<ReturnResponse[]>([]);
  const [activeRentals, setActiveRentals] = useState<RentalResponse[]>([]);
  const [statusFilter, setStatusFilterState] = useState<ReturnStatus | ''>(loadStatusFilter);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const setStatusFilter = useCallback((value: ReturnStatus | '') => {
    saveStatusFilter(value);
    setStatusFilterState(value);
  }, []);

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
      const results = await listReturns(idToken, context.companyId, context.branchId, {
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
      });
      // Defensa en profundidad del aislamiento por sede: el backend ya filtra,
      // pero nunca se muestra una devolucion de otra sede.
      const scoped = results.filter((item) => item.branchId === context.branchId);
      setReturns(scoped);
      setHasMore(results.length >= PAGE_SIZE);
      setState(scoped.length === 0 ? 'EMPTY' : 'READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }

    // Alquileres listos para devolver (ALQ-10 -> "Iniciar devolucion").
    // Un fallo aqui no bloquea la bandeja.
    try {
      const user = getFirebaseAuth().currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        const rentals = await listRentals(idToken, context.companyId, context.branchId, 'ACTIVE');
        setActiveRentals(rentals.filter((r) => r.status === 'ACTIVE' && r.branchId === context.branchId));
      }
    } catch {
      setActiveRentals([]);
    }
  }, [context, statusFilter]);

  const loadMore = useCallback(async () => {
    if (!context || returns.length === 0) return;
    const last = returns[returns.length - 1];
    setLoadingMore(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const next = await listReturns(idToken, context.companyId, context.branchId, {
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        cursor: { createdAt: last.createdAt, id: last.id },
      });
      setReturns((prev) => [...prev, ...next.filter((item) => item.branchId === context.branchId)]);
      setHasMore(next.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [context, returns, statusFilter]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  return { state, returns, activeRentals, context, reload, statusFilter, setStatusFilter, hasMore, loadingMore, loadMore };
}
