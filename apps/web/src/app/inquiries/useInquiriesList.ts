import { useCallback, useEffect, useRef, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listInquiries, InquirySummary, InquiryApiError } from './inquiries-client';
import { useWorkContextForInquiries } from './useWorkContextForInquiries';
import type { InquiryChannel, InquiryStatus } from './inquiry-status';

/** CON-01 - estados READY/LOADING/EMPTY/RECOVERABLE_ERROR/FORBIDDEN (contrato punto 9). */
export type InquiriesListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR' | 'FORBIDDEN';

export interface InquiriesFilters {
  customerId: string;
  channel: InquiryChannel | '';
  status: InquiryStatus | '';
}

const EMPTY_FILTERS: InquiriesFilters = { customerId: '', channel: '', status: '' };

/** CON-01 punto 6 y 15: los filtros se conservan durante la sesion. */
const FILTERS_SESSION_KEY = 'kairos.consultas.filtros';

/**
 * Hallazgo de revision PR#11 ("Filtro por cliente dispara una peticion
 * por tecla"): antes cada `setFilters` disparaba `reload()` de inmediato
 * via el `useEffect` que depende de `filters` - escribir "Maria" en el
 * buscador de cliente mandaba 5 peticiones HTTP, una por letra, y sin
 * ningun control de orden una respuesta lenta de una letra anterior podia
 * pisar el resultado de la ultima letra escrita (respuesta fuera de
 * orden). Se agrega debounce (400ms) sobre el disparo del `reload()`, mas
 * un contador de generacion que descarta cualquier respuesta que no sea
 * la de la peticion mas reciente.
 */
const FILTER_DEBOUNCE_MS = 400;

function loadStoredFilters(): InquiriesFilters {
  try {
    const raw = sessionStorage.getItem(FILTERS_SESSION_KEY);
    if (!raw) return EMPTY_FILTERS;
    return { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<InquiriesFilters>) };
  } catch {
    return EMPTY_FILTERS;
  }
}

function storeFilters(filters: InquiriesFilters) {
  try {
    sessionStorage.setItem(FILTERS_SESSION_KEY, JSON.stringify(filters));
  } catch {
    // sessionStorage puede no estar disponible (privado/bloqueado) - no bloquea la pantalla
  }
}

export function useInquiriesList() {
  const { context, loading: contextLoading } = useWorkContextForInquiries();
  const [state, setState] = useState<InquiriesListState>('LOADING');
  const [inquiries, setInquiries] = useState<InquirySummary[]>([]);
  const [filters, setFiltersState] = useState<InquiriesFilters>(() => loadStoredFilters());
  const requestIdRef = useRef(0);

  const setFilters = useCallback((next: InquiriesFilters) => {
    setFiltersState(next);
    storeFilters(next);
  }, []);

  const reload = useCallback(async () => {
    if (!context) return;
    const requestId = ++requestIdRef.current;
    setState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        if (requestId === requestIdRef.current) setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const results = await listInquiries(idToken, context.companyId, context.branchId, {
        customerId: filters.customerId || undefined,
        channel: filters.channel || undefined,
        status: filters.status || undefined,
      });
      // Proteccion contra respuestas fuera de orden: si mientras esta
      // peticion estaba en vuelo se disparo otra mas reciente (nuevo
      // filtro), esta respuesta llega tarde y se descarta.
      if (requestId !== requestIdRef.current) return;
      setInquiries(results);
      setState(results.length === 0 ? 'EMPTY' : 'READY');
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (error instanceof InquiryApiError && (error.status === 401 || error.status === 403)) {
        setState('FORBIDDEN');
      } else {
        setState('RECOVERABLE_ERROR');
      }
    }
  }, [context, filters]);

  useEffect(() => {
    if (contextLoading) return;
    if (!context) {
      setState('RECOVERABLE_ERROR');
      return;
    }
    const timer = setTimeout(() => void reload(), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // reload ya depende de `filters`, no hace falta duplicarlo aqui
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, contextLoading, filters]);

  return { state, inquiries, context, filters, setFilters, reload };
}
