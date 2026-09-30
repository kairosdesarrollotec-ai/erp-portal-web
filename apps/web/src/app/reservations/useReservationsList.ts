import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listReservations, ReservationSummary } from './reservations-client';
import { useWorkContextForReservations } from './useWorkContextForReservations';

/** RES-01 - estados READY/LOADING/EMPTY/RECOVERABLE_ERROR (contrato punto 9). */
export type ReservationsListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export function useReservationsList() {
  const { context, loading: contextLoading } = useWorkContextForReservations();
  const [state, setState] = useState<ReservationsListState>('LOADING');
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);

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

  return { state, reservations, context, reload };
}
