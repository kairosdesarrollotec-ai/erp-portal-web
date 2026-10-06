import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { listIncidents, type IncidentResponse } from './incidents-client';
import type { IncidentSeverity, IncidentStatus, IncidentType } from './incident-domain';
import { useWorkContextForIncidents } from './useWorkContextForIncidents';

/** INC-01 - estados READY/LOADING/EMPTY (+ RECOVERABLE_ERROR, mismo contrato que DEV-01/ALQ-01). */
export type IncidentsListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export const PAGE_SIZE = 20;
const FILTER_KEY = 'kairos.incidencias.filtros';

export interface IncidentFilters {
  type: IncidentType | '';
  severity: IncidentSeverity | '';
  status: IncidentStatus | '';
}

const EMPTY_FILTERS: IncidentFilters = { type: '', severity: '', status: '' };

/** Filtros conservados en sesion (mismo criterio que DEV-01). */
export function loadFilters(): IncidentFilters {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY);
    return raw ? { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<IncidentFilters>) } : EMPTY_FILTERS;
  } catch {
    return EMPTY_FILTERS;
  }
}

function saveFilters(filters: IncidentFilters): void {
  try {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters));
  } catch {
    // sessionStorage puede no estar disponible - no bloquea la pantalla
  }
}

export function useIncidentsList() {
  const { context, loading: contextLoading } = useWorkContextForIncidents();
  const [searchParams, setSearchParams] = useSearchParams();
  const rentalId = searchParams.get('rentalId') ?? undefined;
  const returnId = searchParams.get('returnId') ?? undefined;

  const [state, setState] = useState<IncidentsListState>('LOADING');
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [filters, setFiltersState] = useState<IncidentFilters>(loadFilters);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const setFilter = useCallback(<K extends keyof IncidentFilters>(key: K, value: IncidentFilters[K]) => {
    setFiltersState((prev) => {
      const next = { ...prev, [key]: value };
      saveFilters(next);
      return next;
    });
  }, []);

  /** Quita el alcance por alquiler/devolucion (`?rentalId=`), conservando el resto. */
  const clearScope = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('rentalId');
        next.delete('returnId');
        return next;
      },
      { replace: true, state: context ?? undefined },
    );
  }, [context, setSearchParams]);

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
      const results = await listIncidents(idToken, context.companyId, context.branchId, {
        type: filters.type || undefined,
        severity: filters.severity || undefined,
        status: filters.status || undefined,
        rentalId,
        returnId,
        limit: PAGE_SIZE,
      });
      // Defensa en profundidad del aislamiento por sede (el backend ya filtra).
      const scoped = results.filter((item) => item.branchId === context.branchId);
      setIncidents(scoped);
      setHasMore(results.length >= PAGE_SIZE);
      setState(scoped.length === 0 ? 'EMPTY' : 'READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [context, filters, rentalId, returnId]);

  const loadMore = useCallback(async () => {
    if (!context || incidents.length === 0) return;
    const last = incidents[incidents.length - 1];
    setLoadingMore(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const next = await listIncidents(idToken, context.companyId, context.branchId, {
        type: filters.type || undefined,
        severity: filters.severity || undefined,
        status: filters.status || undefined,
        rentalId,
        returnId,
        limit: PAGE_SIZE,
        cursor: { createdAt: last.createdAt, id: last.id },
      });
      setIncidents((prev) => [...prev, ...next.filter((item) => item.branchId === context.branchId)]);
      setHasMore(next.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [context, incidents, filters, rentalId, returnId]);

  /** Sustituye una fila con la respuesta de un comando (resolver) sin recargar la bandeja. */
  const replaceIncident = useCallback((updated: IncidentResponse) => {
    setIncidents((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  }, []);

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
    incidents,
    context,
    reload,
    filters,
    setFilter,
    rentalId,
    returnId,
    clearScope,
    hasMore,
    loadingMore,
    loadMore,
    replaceIncident,
  };
}
