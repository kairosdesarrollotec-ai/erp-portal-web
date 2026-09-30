import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listRentals, RentalResponse } from './rentals-client';
import { useWorkContextForRentals } from './useWorkContextForRentals';

/** ALQ-01 - estados READY/LOADING/EMPTY/RECOVERABLE_ERROR (mismo contrato que RES-01/CON-01). */
export type RentalsListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export function useRentalsList() {
  const { context, loading: contextLoading } = useWorkContextForRentals();
  const [state, setState] = useState<RentalsListState>('LOADING');
  const [rentals, setRentals] = useState<RentalResponse[]>([]);

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
      const results = await listRentals(idToken, context.companyId, context.branchId);
      setRentals(results);
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

  return { state, rentals, context, reload };
}
