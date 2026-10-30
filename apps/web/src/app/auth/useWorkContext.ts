import { useCallback, useEffect, useState } from 'react';
import { rememberWorkContext } from './work-context-memory';
import { useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import {
  getWorkContextAssignments,
  selectWorkContext,
  type WorkContextAssignment,
} from './work-context-client';

/**
 * TR-05 - Seleccion de empresa/sede. Fuente: PANTALLAS-V2-B-TRANSVERSAL.md.
 * Estados del contrato: READY, EMPTY ("no deberia ocurrir, pero se
 * contempla" - punto 9). No hay prototipo EMPTY aprobado todavia (solo
 * PROTO-TR-05-SELECCION-EMPRESA-SEDE, READY, desktop) - el mensaje EMPTY
 * de esta pantalla es minimo/defensivo, no un layout con prototipo propio.
 *
 * Sigue el mismo patron que useActivation.ts: la pantalla es dueña de su
 * propio fetch (via el usuario ya autenticado en getFirebaseAuth()), no
 * recibe las asignaciones por navegacion/router state.
 */
export type WorkContextScreenState = 'LOADING' | 'READY' | 'EMPTY' | 'SELECTING';

export function useWorkContext() {
  const [state, setState] = useState<WorkContextScreenState>('LOADING');
  const [assignments, setAssignments] = useState<WorkContextAssignment[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        navigate('/');
        return;
      }
      try {
        const idToken = await user.getIdToken();
        const result = await getWorkContextAssignments(idToken);
        if (cancelled) return;
        setAssignments(result);
        setState(result.length > 0 ? 'READY' : 'EMPTY');
      } catch {
        // Sin prototipo de error propio para TR-05 - si el chequeo falla
        // (backend caido) se trata igual que "sin asignaciones" (EMPTY),
        // nunca se deja al usuario en un LOADING indefinido.
        if (!cancelled) setState('EMPTY');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const selectContext = useCallback(
    async (assignment: WorkContextAssignment) => {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        navigate('/');
        return;
      }
      setState('SELECTING');
      try {
        const idToken = await user.getIdToken();
        await selectWorkContext(idToken, assignment.companyId, assignment.branchId);
        rememberWorkContext(assignment);
        navigate('/tablero', {
          state: {
            companyId: assignment.companyId,
            companyName: assignment.companyName,
            branchId: assignment.branchId,
            branchName: assignment.branchName,
          },
        });
      } catch {
        // El backend rechazo la combinacion (403, BR-ORG-002) o fallo de
        // red - se vuelve a mostrar la lista, nunca se avanza al tablero
        // sin confirmacion del backend.
        setState('READY');
      }
    },
    [navigate],
  );

  return { state, assignments, selectContext };
}
