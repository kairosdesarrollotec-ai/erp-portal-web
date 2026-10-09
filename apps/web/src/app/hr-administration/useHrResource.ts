import { useCallback, useEffect, useRef, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { HrApiError, type HrScope } from './hr-client';
import { useWorkContextForHr, type HrWorkContext } from './useWorkContextForHr';

/** Estados de las pantallas de Personal: LOADING / READY / error recuperable (+ 403 y 404 explicitos). */
export type HrResourceState = 'LOADING' | 'READY' | 'FORBIDDEN' | 'NOT_FOUND' | 'RECOVERABLE_ERROR';

/**
 * Carga un recurso con token + contexto de sede. `key` identifica la consulta: si cambia
 * (otro id, otro mes) se vuelve a cargar. `reload()` refresca sin perder el dato anterior en pantalla.
 */
export function useHrResource<T>(
  load: ((idToken: string, scope: HrScope, context: HrWorkContext) => Promise<T>) | null,
  key: string,
) {
  const { context, loading: contextLoading } = useWorkContextForHr();
  const [state, setState] = useState<HrResourceState>('LOADING');
  const [data, setData] = useState<T | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(async () => {
    const fn = loadRef.current;
    if (!context || !fn) return;
    setState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const result = await fn(idToken, { companyId: context.companyId, branchId: context.branchId }, context);
      setData(result);
      setState('READY');
    } catch (err) {
      if (err instanceof HrApiError && err.status === 403) setState('FORBIDDEN');
      else if (err instanceof HrApiError && err.status === 404) setState('NOT_FOUND');
      else setState('RECOVERABLE_ERROR');
    }
    // `key` identifica la consulta actual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, key]);

  useEffect(() => {
    if (!contextLoading && context && load) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, contextLoading, reload]);

  return { state, data, context, reload, setData };
}
