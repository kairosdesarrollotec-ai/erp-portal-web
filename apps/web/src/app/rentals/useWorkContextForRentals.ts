import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getWorkContextAssignments } from '../auth/work-context-client';
import { isNetworkFailure, recallContext, rememberContext } from '../../offline/session/offline-session';

export interface RentalsWorkContext {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

/** Mismo patron que useWorkContextForReservations.ts (TR-06). */
export function useWorkContextForRentals(): {
  context: RentalsWorkContext | null;
  loading: boolean;
} {
  const [context, setContext] = useState<RentalsWorkContext | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const navState = location.state as RentalsWorkContext | null;
      if (navState?.companyId && navState?.branchId) {
        if (!cancelled) {
          setContext(navState);
          setLoading(false);
        }
        void rememberContext({
          companyId: navState.companyId,
          companyName: navState.companyName,
          branchId: navState.branchId,
          branchName: navState.branchName,
        });
        return;
      }

      const user = getFirebaseAuth().currentUser;
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const idToken = await user.getIdToken();
        const assignments = await getWorkContextAssignments(idToken);
        if (cancelled) return;
        if (assignments.length === 1) {
          const only = assignments[0];
          setContext({
            companyId: only.companyId,
            companyName: only.companyName,
            branchId: only.branchId,
            branchName: only.branchName,
          });
          void rememberContext({
            companyId: only.companyId,
            companyName: only.companyName,
            branchId: only.branchId,
            branchName: only.branchName,
          });
        } else if (assignments.length > 1) {
          navigate('/seleccion-empresa-sede', { replace: true });
        }
      } catch (error) {
        // V-27: sin red, se usa el contexto de la última verificación del servidor (≤ 8 h, sesión offline).
        if (isNetworkFailure(error)) {
          const stored = await recallContext();
          if (!cancelled && stored) setContext(stored);
        }
        // si no hay copia local se deja sin resolver - la pantalla muestra su propio estado defensivo
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
