import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getWorkContextAssignments } from '../auth/work-context-client';

export interface ReservationsWorkContext {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

/**
 * Resuelve companyId/branchId (RES-01/RES-04/RES-05).
 *
 * Hallazgo de revision (finding #8): antes, si la navegacion traia el
 * contexto en `location.state`, se usaba directo sin validarlo - un
 * `state` viejo, manipulado, o de otra cuenta se aceptaba tal cual, y con
 * eso se filtraba la bandeja y se ejecutaban comandos de mutacion sobre
 * una reserva. Ahora `location.state` es apenas un candidato: siempre se
 * confirma contra la lista real de asignaciones del backend
 * (getWorkContextAssignments, la misma fuente que TR-05/TR-06) antes de
 * usarlo. Si no coincide con ninguna asignacion real, se ignora y se
 * resuelve igual que sin estado de navegacion: 1 sola asignacion se usa
 * directo, mas de 1 vuelve a TR-05, 0/error queda sin resolver (nunca
 * bloquea con un error duro - la pantalla que llama a este hook decide
 * como mostrar "sin contexto").
 */
export function useWorkContextForReservations(): {
  context: ReservationsWorkContext | null;
  loading: boolean;
} {
  const [context, setContext] = useState<ReservationsWorkContext | null>(null);
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

        const navState = location.state as ReservationsWorkContext | null;
        if (navState?.companyId && navState?.branchId) {
          const confirmed = assignments.find(
            (a) => a.companyId === navState.companyId && a.branchId === navState.branchId,
          );
          if (confirmed) {
            setContext(confirmed);
            return;
          }
          // No coincide con ninguna asignacion real - cae al mismo
          // criterio de 0/1/N de abajo.
        }

        if (assignments.length === 1) {
          setContext(assignments[0]);
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
