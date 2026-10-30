import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getWorkContextAssignments } from '../auth/work-context-client';
import type { InquiriesWorkContext } from './inquiries-nav-state';
import { recallWorkContext } from '../auth/work-context-memory';

/**
 * Resuelve companyId/branchId igual que useWorkContextForReservations.ts
 * (TR-06, corregido en la revision de PR#10, hallazgo #8).
 *
 * Hallazgo de revision PR#11 (mismo patron que el finding #8 de PR#10,
 * cubierto aqui bajo "Contexto incompleto"/"aislamiento multiempresa" de
 * la lista de verificacion): antes esta funcion confiaba directo en
 * `location.state` sin validarlo contra el backend - un state manipulado
 * o desactualizado (por ejemplo, tras perder una asignacion) se usaba tal
 * cual. Ahora siempre reconsulta `getWorkContextAssignments` primero, y
 * solo usa `location.state` si coincide con una asignacion real
 * confirmada; si no coincide, se ignora y se resuelve igual que si no
 * hubiera state (1 asignacion -> directo, >1 -> TR-05).
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
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const idToken = await user.getIdToken();
        const assignments = await getWorkContextAssignments(idToken);
        if (cancelled) return;

        const navState = location.state as InquiriesWorkContext | null;
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
