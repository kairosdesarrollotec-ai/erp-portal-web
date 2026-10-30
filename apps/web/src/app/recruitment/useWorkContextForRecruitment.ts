import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getWorkContextAssignments } from '../auth/work-context-client';
import { recallWorkContext } from '../auth/work-context-memory';

export interface RecruitmentWorkContext {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

/**
 * Mismo patron que useWorkContextForRentals.ts (TR-06): el contexto empresa/sede
 * viaja en location.state o se resuelve desde las asignaciones del usuario.
 * Todas las llamadas a /recruitment incluyen companyId/branchId de este contexto
 * (aislamiento por sede).
 */
export function useWorkContextForRecruitment(): {
  context: RecruitmentWorkContext | null;
  loading: boolean;
} {
  const [context, setContext] = useState<RecruitmentWorkContext | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const navState = location.state as RecruitmentWorkContext | null;
      if (navState?.companyId && navState?.branchId) {
        if (!cancelled) {
          setContext({
            companyId: navState.companyId,
            companyName: navState.companyName,
            branchId: navState.branchId,
            branchName: navState.branchName,
          });
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
