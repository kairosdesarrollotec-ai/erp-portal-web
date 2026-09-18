import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import {
  getWorkContextAssignments,
  selectWorkContext,
  WorkContextApiError,
  type WorkContextAssignment,
} from './work-context-client';

/**
 * TR-05 - Seleccion de empresa/sede. Fuente: PANTALLAS-V2-B-TRANSVERSAL.md.
 * Estados del contrato: READY, EMPTY ("no deberia ocurrir, pero se
 * contempla" - punto 9). No hay prototipo EMPTY aprobado todavia (solo
 * PROTO-TR-05-SELECCION-EMPRESA-SEDE, READY, desktop) - el mensaje EMPTY
 * de esta pantalla es minimo/defensivo, no un layout con prototipo propio.
 *
 * RECOVERABLE_ERROR (hallazgo de revision del PR #8): EMPTY solo significa
 * "el backend respondio y la lista realmente vino vacia" - un fallo tecnico
 * (401/403/5xx, red caida, respuesta con forma invalida) es un estado
 * distinto y reintentable, nunca se le dice al usuario "no tienes ninguna
 * empresa asignada" cuando en realidad no pudimos preguntarle al backend.
 * Al igual que EMPTY, RECOVERABLE_ERROR tampoco tiene prototipo propio
 * todavia (ver nota en WorkContextScreen.tsx) - el mensaje/boton de
 * reintentar son minimos/defensivos.
 *
 * Sigue el mismo patron que useActivation.ts: la pantalla es dueña de su
 * propio fetch (via el usuario ya autenticado en getFirebaseAuth()), no
 * recibe las asignaciones por navegacion/router state.
 */
export type WorkContextScreenState = 'LOADING' | 'READY' | 'EMPTY' | 'SELECTING' | 'RECOVERABLE_ERROR';

export function useWorkContext() {
  const [state, setState] = useState<WorkContextScreenState>('LOADING');
  const [assignments, setAssignments] = useState<WorkContextAssignment[]>([]);
  // Mensaje de la ultima seleccion rechazada (hallazgo de revision: antes
  // se volvia a READY en silencio, sin decirle al usuario por que su click
  // no lo llevo a ningun lado). Se limpia en cada intento nuevo.
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setState('LOADING');
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      navigate('/');
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const result = await getWorkContextAssignments(idToken);
      setAssignments(result);
      setState(result.length > 0 ? 'READY' : 'EMPTY');
    } catch {
      // Cualquier fallo aqui (401/403/5xx, red, respuesta invalida - ver
      // WorkContextApiError en work-context-client.ts) es tecnico, nunca
      // "el usuario no tiene asignaciones" (eso ya se maneja arriba, con
      // una respuesta 200 y lista vacia).
      setAssignments([]);
      setState('RECOVERABLE_ERROR');
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectContext = useCallback(
    async (assignment: WorkContextAssignment) => {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        navigate('/');
        return;
      }
      setSelectionError(null);
      setState('SELECTING');
      try {
        const idToken = await user.getIdToken();
        await selectWorkContext(idToken, assignment.companyId, assignment.branchId);
        navigate('/tablero');
      } catch (error) {
        // El backend rechazo la combinacion (403, BR-ORG-002) o fallo de
        // red - se vuelve a mostrar la lista, nunca se avanza al tablero
        // sin confirmacion del backend. Hallazgo de revision: antes esto
        // pasaba en silencio (el usuario solo veia que "no paso nada"); //
        // ahora se explica que ocurrio y se deja reintentar (nunca se
        // reintenta solo, sobre todo por el caso 403 - ver nota en
        // work-context-client.ts).
        setSelectionError(
          error instanceof WorkContextApiError && error.status === 403
            ? 'Esa combinación de empresa y sede ya no está disponible para tu usuario. Actualiza la página o contacta a tu administrador.'
            : 'No pudimos confirmar tu selección por un problema de conexión. Intenta de nuevo.',
        );
        setState('READY');
      }
    },
    [navigate],
  );

  return { state, assignments, selectionError, selectContext, retry: load };
}
