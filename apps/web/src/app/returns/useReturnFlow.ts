import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getReturn, ReturnApiError, ReturnResponse } from './returns-client';
import { useWorkContextForReturns } from './useWorkContextForReturns';
import { isNetworkFailure, recallResource, rememberResource } from '../../offline/session/offline-session';

/**
 * Hook base del proceso de Devolucion (DEV-03..DEV-10). Carga el expediente por
 * :id y expone el contexto multiempresa + un helper de idToken para que cada
 * pantalla ejecute su propio comando. El estado de dominio del backend manda:
 * cada comando devuelve el expediente actualizado (version/etag nuevos).
 */
export type ReturnFlowState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR' | 'NOT_FOUND';

export function useReturnFlow() {
  const { id } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForReturns();
  const [state, setState] = useState<ReturnFlowState>('LOADING');
  const [ret, setRet] = useState<ReturnResponse | null>(null);

  const load = useCallback(
    async (silent: boolean) => {
      if (!context || !id) return;
      if (!silent) setState('LOADING');
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) {
          if (!silent) setState('RECOVERABLE_ERROR');
          return;
        }
        const idToken = await user.getIdToken();
        const result = await getReturn(idToken, id, context.companyId, context.branchId);
        if (result.branchId !== context.branchId) {
          // Aislamiento por sede: un expediente de otra sede se trata como inexistente.
          setRet(null);
          setState('NOT_FOUND');
          return;
        }
        setRet(result);
        setState('READY');
        // V-27: copia cifrada del expediente para reabrir el checklist sin conexión (≤ 8 h).
        void rememberResource(`return:${id}`, result);
      } catch (error) {
        // V-27: sin red, se muestra el último expediente conocido (el estado de dominio real lo valida el servidor al sincronizar).
        if (isNetworkFailure(error)) {
          const stored = await recallResource<ReturnResponse>(`return:${id}`);
          if (stored && stored.branchId === context.branchId) {
            setRet(stored);
            setState('READY');
            return;
          }
        }
        if (silent) return;
        if (error instanceof ReturnApiError && (error.status === 404 || error.status === 403)) {
          setState('NOT_FOUND');
        } else {
          setState('RECOVERABLE_ERROR');
        }
      }
    },
    [context, id],
  );

  /** Recarga con indicador de carga (la pantalla muestra LOADING). */
  const reload = useCallback(() => load(false), [load]);
  /** Recarga silenciosa: actualiza version/etag sin parpadeo (tras comandos que no devuelven el expediente). */
  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    if (!contextLoading && context && id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, id, reload]);

  const getIdToken = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('Sesión no disponible');
    return user.getIdToken();
  }, []);

  return { id: id ?? '', state, ret, context, reload, refresh, setRet, getIdToken };
}
