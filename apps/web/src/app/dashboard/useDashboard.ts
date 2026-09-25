import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getDashboard } from './dashboard-client';
import { getWorkContextAssignments, type WorkContextAssignment } from '../auth/work-context-client';
import type { WorkerRole } from './worker-role';

/**
 * TR-06 (HU-24) - estados: LOADING, READY (rol resuelto, tablero EMPTY
 * por ahora - ver nota en GetDashboardHandler del backend), UNRESOLVED
 * (no se pudo determinar un contexto empresa/sede valido - defensivo,
 * no deberia ocurrir en el flujo normal ya que TR-01/TR-05 siempre
 * navegan aqui con el contexto resuelto).
 *
 * RECOVERABLE_ERROR (hallazgo de revision, PR #9 finding #5): antes,
 * cualquier fallo (401/403/404/5xx del tablero, o de la propia consulta de
 * asignaciones) terminaba indistintamente en UNRESOLVED junto con "el
 * usuario de verdad no tiene contexto" - un mensaje que le dice al usuario
 * "vuelve a iniciar sesion" cuando el problema real es tecnico y
 * reintentable. UNRESOLVED ahora es exclusivamente "no existe un contexto
 * empresa/sede vigente para este usuario" (0 asignaciones reales, o el
 * usuario no esta autenticado); RECOVERABLE_ERROR es cualquier otra falla
 * (red, 401/403/5xx, respuesta con forma invalida).
 */
export type DashboardScreenState = 'LOADING' | 'READY' | 'UNRESOLVED' | 'RECOVERABLE_ERROR';

interface WorkContextNavigationState {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

const MULTIPLE_ASSIGNMENTS = Symbol('MULTIPLE_ASSIGNMENTS');

export function useDashboard() {
  const [state, setState] = useState<DashboardScreenState>('LOADING');
  const [role, setRole] = useState<WorkerRole | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    // Hallazgo de revision (finding #2): `location.state` (como llega de
    // useLogin.ts o de useWorkContext.ts tras elegir una tarjeta) nunca se
    // usa como fuente de verdad por si solo - es apenas un candidato. Se
    // confirma contra la lista real de asignaciones del backend
    // (getWorkContextAssignments, la misma fuente que TR-05) antes de
    // mostrar cualquier nombre de empresa/sede en pantalla. Si no coincide
    // con ninguna asignacion real (estado manipulado, viejo, o de otra
    // cuenta), se ignora por completo y se resuelve igual que si no
    // hubiera llegado ningun estado de navegacion.
    async function resolveContext(): Promise<WorkContextAssignment | null | typeof MULTIPLE_ASSIGNMENTS> {
      const user = getFirebaseAuth().currentUser;
      if (!user) return null;

      const idToken = await user.getIdToken();
      const assignments = await getWorkContextAssignments(idToken);

      const navState = location.state as WorkContextNavigationState | null;
      if (navState?.companyId && navState?.branchId) {
        const confirmed = assignments.find(
          (a) => a.companyId === navState.companyId && a.branchId === navState.branchId,
        );
        if (confirmed) return confirmed;
        // No coincide con ninguna asignacion real - cae al mismo criterio
        // de 0/1/N de abajo, como si no hubiera llegado estado alguno.
      }

      if (assignments.length === 1) return assignments[0];
      if (assignments.length > 1) {
        navigate('/seleccion-empresa-sede', { replace: true });
        return MULTIPLE_ASSIGNMENTS;
      }
      return null;
    }

    async function load() {
      setState('LOADING');
      let context: WorkContextAssignment | null | typeof MULTIPLE_ASSIGNMENTS;
      try {
        context = await resolveContext();
      } catch {
        // Fallo tecnico consultando las asignaciones (red/backend) -
        // reintentable, nunca "no tienes contexto" (finding #5).
        if (!cancelled) setState('RECOVERABLE_ERROR');
        return;
      }
      if (cancelled || context === MULTIPLE_ASSIGNMENTS) return;
      if (!context) {
        setState('UNRESOLVED');
        return;
      }

      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('UNRESOLVED');
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const result = await getDashboard(idToken, context.companyId, context.branchId);
        if (cancelled) return;
        setRole(result.role);
        setBranchName(`${context.companyName} — ${context.branchName}`);
        setState('READY');
      } catch {
        if (!cancelled) setState('RECOVERABLE_ERROR');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [location.state, navigate, retryToken]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  return { state, role, branchName, retry };
}
