import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getWorkContextAssignments } from '../auth/work-context-client';
import type { FleetWorkContext } from './fleet-nav-state';
import { recallWorkContext } from '../auth/work-context-memory';

export function useWorkContextForFleet(): {
  context: FleetWorkContext | null;
  loading: boolean;
} {
  const [context, setContext] = useState<FleetWorkContext | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const idToken = await user.getIdToken();
        const assignments = await getWorkContextAssignments(idToken);
        if (cancelled) return;

        const navState = location.state as FleetWorkContext | null;
        if (navState?.companyId && navState?.branchId) {
          const confirmed = assignments.find(
            (a) => a.companyId === navState.companyId && a.branchId === navState.branchId,
          );
          if (confirmed) {
            setContext(navState);
            return;
          }
        }

        const onlyOrRemembered = assignments.length === 1 ? assignments[0] : recallWorkContext(assignments);
        if (onlyOrRemembered) {
          const only = onlyOrRemembered;
          setContext({
            companyId: only.companyId,
            companyName: only.companyName,
            branchId: only.branchId,
            branchName: only.branchName,
          });
        } else if (assignments.length > 1) {
          navigate('/seleccion-empresa-sede', { replace: true });
        }
      } catch {
        // En caso de fallo técnico, no se resuelve y la pantalla maneja el estado defensivo
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [location.state, navigate]);

  return { context, loading };
}
