import { useCallback, useEffect, useRef, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listInquiries, InquirySummary, InquiryApiError } from './inquiries-client';
import { getCustomer } from '../customers/customers-client';
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
  /**
   * Bug fix (Consultas - "Sin cliente registrado" con cliente vinculado):
   * GET /inquiries solo trae `customerId` (CONFLICT-CON-002 - la identidad
   * vive en Customer, no en Inquiry). El nombre se resuelve aparte via
   * `GET /customers/{id}` para cada `customerId` distinto de la pagina
   * actual y se cachea aqui por id - antes NINGUN codigo hacia esta
   * resolucion y la bandeja leia un campo `inquiry.customer` que el
   * backend nunca envia.
   */
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
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

      const missingIds = Array.from(
        new Set(
          results
            .map((inquiry) => inquiry.customerId)
            .filter((customerId): customerId is string => Boolean(customerId) && !(customerId! in customerNames)),
        ),
      );
      if (missingIds.length > 0) {
        void Promise.all(
          missingIds.map(async (customerId) => {
            try {
              const customer = await getCustomer(idToken, customerId, context.companyId, context.branchId);
              return [customerId, customer.fullName] as const;
            } catch {
              return [customerId, null] as const;
            }
          }),
        ).then((entries) => {
          if (requestId !== requestIdRef.current) return;
          setCustomerNames((prev) => {
            const next = { ...prev };
            for (const [customerId, fullName] of entries) {
              if (fullName) next[customerId] = fullName;
            }
            return next;
          });
        });
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (error instanceof InquiryApiError && (error.status === 401 || error.status === 403)) {
        setState('FORBIDDEN');
      } else {
        setState('RECOVERABLE_ERROR');
      }
    }
  }, [context, filters, customerNames]);

  useEffect(() => {
    if (contextLoading) return;
    if (!context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
      return;
    }
    const timer = setTimeout(() => void reload(), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // reload ya depende de `filters`, no hace falta duplicarlo aqui
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, contextLoading, filters]);

  return { state, inquiries, customerNames, context, filters, setFilters, reload };
}
