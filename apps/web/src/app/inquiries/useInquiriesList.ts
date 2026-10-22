import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listInquiries, InquirySummary, InquiryApiError } from './inquiries-client';
import { getCustomer } from '../customers/customers-client';
import { useWorkContextForInquiries } from './useWorkContextForInquiries';
import type { InquiryChannel, InquiryStatus } from './inquiry-status';

/** CON-01 - estados READY/LOADING/EMPTY/RECOVERABLE_ERROR/FORBIDDEN (contrato punto 9). */
export type InquiriesListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR' | 'FORBIDDEN';

export interface InquiriesFilters {
  /**
   * Texto libre de "Buscar por cliente". NO se envia como `customerId` (era un UUID y el texto
   * rompia el contrato): se filtra aqui por nombre de cliente ya resuelto. Cuando el backend
   * exponga su parametro de busqueda por cliente se enviara en `listInquiries`.
   */
  customerQuery: string;
  channel: InquiryChannel | '';
  status: InquiryStatus | '';
}

const EMPTY_FILTERS: InquiriesFilters = { customerQuery: '', channel: '', status: '' };

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

/** Tamano de pagina de la bandeja (paginacion keyset del backend: cursorCreatedAt + cursorId). */
const PAGE_SIZE = 50;

function loadStoredFilters(): InquiriesFilters {
  try {
    const raw = sessionStorage.getItem(FILTERS_SESSION_KEY);
    if (!raw) return EMPTY_FILTERS;
    const parsed = JSON.parse(raw) as Partial<InquiriesFilters>;
    return {
      customerQuery: typeof parsed.customerQuery === 'string' ? parsed.customerQuery : '',
      channel: parsed.channel ?? '',
      status: parsed.status ?? '',
    };
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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
        channel: filters.channel || undefined,
        status: filters.status || undefined,
        limit: PAGE_SIZE,
      });
      // Proteccion contra respuestas fuera de orden: si mientras esta
      // peticion estaba en vuelo se disparo otra mas reciente (nuevo
      // filtro), esta respuesta llega tarde y se descarta.
      if (requestId !== requestIdRef.current) return;
      setInquiries(results);
      setHasMore(results.length >= PAGE_SIZE);
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
  }, [context, filters.channel, filters.status, customerNames]);

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
  }, [context, contextLoading, filters.channel, filters.status]);

  /** Siguiente pagina por cursor (createdAt + id de la ultima fila cargada). */
  const loadMore = useCallback(async () => {
    const last = inquiries[inquiries.length - 1];
    if (!context || !last || loadingMore) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const page = await listInquiries(idToken, context.companyId, context.branchId, {
        channel: filters.channel || undefined,
        status: filters.status || undefined,
        limit: PAGE_SIZE,
        cursorCreatedAt: last.createdAt,
        cursorId: last.id,
      });
      if (requestId !== requestIdRef.current) return;
      setInquiries((prev) => [...prev, ...page.filter((item) => !prev.some((p) => p.id === item.id))]);
      setHasMore(page.length >= PAGE_SIZE);
      const missing = Array.from(
        new Set(page.map((i) => i.customerId).filter((id): id is string => Boolean(id) && !(id! in customerNames))),
      );
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            return [id, (await getCustomer(idToken, id, context.companyId, context.branchId)).fullName] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      setCustomerNames((prev) => {
        const next = { ...prev };
        for (const [id, name] of entries) if (name) next[id] = name;
        return next;
      });
    } catch {
      // se conserva lo ya cargado; el usuario puede reintentar con el mismo boton
    } finally {
      setLoadingMore(false);
    }
  }, [context, inquiries, filters.channel, filters.status, loadingMore, customerNames]);

  const customerQuery = filters.customerQuery.trim().toLowerCase();
  const visibleInquiries = useMemo(() => {
    if (!customerQuery) return inquiries;
    return inquiries.filter((inquiry) => {
      const name = inquiry.customerId ? customerNames[inquiry.customerId] : undefined;
      return name ? name.toLowerCase().includes(customerQuery) : false;
    });
  }, [inquiries, customerNames, customerQuery]);

  return { state, inquiries: visibleInquiries, customerNames, context, filters, setFilters, reload, hasMore, loadingMore, loadMore };
}
