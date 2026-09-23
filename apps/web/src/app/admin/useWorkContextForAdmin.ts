import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getWorkContextAssignments } from '../auth/work-context-client';

export interface AdminWorkContext {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

/**
 * Resuelve companyId/branchId igual que useWorkContextForReservations.ts
 * (RES-01) y useDashboard.ts (TR-06): si la navegacion trae el contexto
 * en location.state lo usa directo; si no (recarga directa de
 * /admin/usuarios), lo resuelve por asignaciones - 1 sola se usa directo,
 * mas de 1 vuelve a TR-05, 0/error queda sin resolver (nunca bloquea con
 * un error duro - la pantalla misma muestra su estado defensivo).
 */
export function useWorkContextForAdmin(): {
  context: AdminWorkContext | null;
  loading: boolean;
} {
  const [context, setContext] = useState<AdminWorkContext | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const navState = location.state as AdminWorkContext | null;
      if (navState?.companyId && navState?.branchId) {
        if (!cancelled) {
          setContext(navState);
          setLoading(false);
        }
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
        } else if (assignments.length > 1) {
          navigate('/seleccion-empresa-sede', { replace: true });
        }
      } catch {
        // se deja sin resolver - la pantalla muestra su propio estado defensivo
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
