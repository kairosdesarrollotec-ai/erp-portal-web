import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listReservations, ReservationSummary } from './reservations-client';
import { useWorkContextForReservations } from './useWorkContextForReservations';
import type { ReservationStatus } from './reservation-status';

/** RES-01 (PEND-11): filtros de la bandeja, conservados durante la sesion. */
export interface ReservationsFilters {
  query: string;
  status: ReservationStatus | '';
}

const EMPTY_FILTERS: ReservationsFilters = { query: '', status: '' };
const FILTERS_SESSION_KEY = 'kairos.reservas.filtros';

function loadStoredFilters(): ReservationsFilters {
  try {
    const raw = sessionStorage.getItem(FILTERS_SESSION_KEY);
    if (!raw) return EMPTY_FILTERS;
    const parsed = JSON.parse(raw) as Partial<ReservationsFilters>;
    return {
      query: typeof parsed.query === 'string' ? parsed.query : '',
      status: parsed.status ?? '',
    };
  } catch {
    return EMPTY_FILTERS;
  }
}

function storeFilters(filters: ReservationsFilters) {
  try {
    sessionStorage.setItem(FILTERS_SESSION_KEY, JSON.stringify(filters));
  } catch {
    // sessionStorage no disponible: no bloquea la pantalla
  }
}

/** RES-01 - estados READY/LOADING/EMPTY/RECOVERABLE_ERROR (contrato punto 9). */
export type ReservationsListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export function useReservationsList() {
  const { context, loading: contextLoading } = useWorkContextForReservations();
  const [state, setState] = useState<ReservationsListState>('LOADING');
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [filters, setFiltersState] = useState<ReservationsFilters>(() => loadStoredFilters());

  const setFilters = useCallback((next: ReservationsFilters) => {
    setFiltersState(next);
    storeFilters(next);
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
      const results = await listReservations(idToken, context.companyId, context.branchId);
      setReservations(results);
      setState(results.length === 0 ? 'EMPTY' : 'READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [context]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  const query = filters.query.trim().toLowerCase();
  const visibleReservations = useMemo(
    () =>
      reservations.filter((reservation) => {
        if (filters.status && reservation.status !== filters.status) return false;
        if (!query) return true;
        return (
          reservation.customer.name.toLowerCase().includes(query) ||
          reservation.vehicle.label.toLowerCase().includes(query)
        );
      }),
    [reservations, filters.status, query],
  );

  return { state, reservations: visibleReservations, totalCount: reservations.length, context, reload, filters, setFilters };
}
