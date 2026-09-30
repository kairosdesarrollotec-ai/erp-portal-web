import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { AuditEvent, AuditEventsFilter, listAuditEvents } from './audit-events-client';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';

/** ADM-04 - estados READY/LOADING/EMPTY (contrato punto 9, sin escritura). */
export type AuditEventsState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

export function useAuditEvents() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const [state, setState] = useState<AuditEventsState>('LOADING');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filter, setFilter] = useState<AuditEventsFilter>({});

  const reload = useCallback(
    async (nextFilter: AuditEventsFilter = filter) => {
      if (!context) return;
      setState('LOADING');
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) {
          setState('RECOVERABLE_ERROR');
          return;
        }
        const idToken = await user.getIdToken();
        const results = await listAuditEvents(idToken, context.companyId, context.branchId, nextFilter);
        setEvents(results);
        setState(results.length === 0 ? 'EMPTY' : 'READY');
      } catch {
        setState('RECOVERABLE_ERROR');
      }
    },
    [context, filter],
  );

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload({});
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, contextLoading]);

  function applyFilter(nextFilter: AuditEventsFilter) {
    setFilter(nextFilter);
    void reload(nextFilter);
  }

  return { state, events, context, filter, applyFilter, reload };
}
