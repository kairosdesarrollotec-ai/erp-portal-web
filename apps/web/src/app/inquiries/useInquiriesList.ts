import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listInquiries, InquirySummary } from './inquiries-client';
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

  const setFilters = useCallback((next: InquiriesFilters) => {
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
      const results = await listInquiries(idToken, context.companyId, {
        customerId: filters.customerId || undefined,
        channel: filters.channel || undefined,
        status: filters.status || undefined,
      });
      setInquiries(results);
      setState(results.length === 0 ? 'EMPTY' : 'READY');
    } catch (error) {
      if (error instanceof Error && error.message.includes('(403)')) {
        setState('FORBIDDEN');
      } else {
        setState('RECOVERABLE_ERROR');
      }
    }
  }, [context, filters]);

  useEffect(() => {
    if (!contextLoading && context) {
      void reload();
    } else if (!contextLoading && !context) {
      setState('RECOVERABLE_ERROR');
    }
    // reload ya depende de `filters`, no hace falta duplicarlo aqui
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, contextLoading, filters]);

  return { state, inquiries, context, filters, setFilters, reload };
}
