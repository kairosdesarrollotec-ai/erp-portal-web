import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getWorkContextAssignments } from '../auth/work-context-client';
import type { InquiriesWorkContext } from './inquiries-nav-state';

/**
 * Resuelve companyId/branchId igual que useWorkContextForReservations.ts
 * (TR-06): si la navegacion trae el contexto en location.state lo usa
 * directo (incluye el caso en que ese state trae ademas datos propios de
 * la Consulta - `InquiryNavState` extiende `InquiriesWorkContext`, asi que
 * los campos adicionales simplemente se ignoran aqui); si no (recarga
 * directa de /consultas), lo resuelve por asignaciones - 1 sola se usa
 * directo, mas de 1 vuelve a TR-05, 0/error queda sin resolver (nunca
 * bloquea con un error duro).
 */
export function useWorkContextForInquiries(): {
  context: InquiriesWorkContext | null;
  loading: boolean;
} {
  const [context, setContext] = useState<InquiriesWorkContext | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const navState = location.state as InquiriesWorkContext | null;
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
