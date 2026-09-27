import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getDashboard, DashboardTaskItem } from './dashboard-client';
import { getWorkContextAssignments } from '../auth/work-context-client';
import type { WorkerRole } from './worker-role';

/**
 * TR-06 (HU-24) - estados: LOADING, READY (rol resuelto, tablero EMPTY
 * por ahora - ver nota en GetDashboardHandler del backend), UNRESOLVED
 * (no se pudo determinar un contexto empresa/sede valido - defensivo,
 * no deberia ocurrir en el flujo normal ya que TR-01/TR-05 siempre
 * navegan aqui con el contexto resuelto).
 */
export type DashboardScreenState = 'LOADING' | 'READY' | 'UNRESOLVED';

/**
 * Estado del TABLERO devuelto por el backend (distinto de
 * DashboardScreenState, que es el ciclo de vida de ESTA pantalla:
 * resolver contexto + pedir el tablero). 'EMPTY' o 'READY' con
 * `tasks` (ver dashboard-client.ts).
 */
export type DashboardDataState = 'EMPTY' | 'READY';

interface WorkContextNavigationState {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

export function useDashboard() {
  const [state, setState] = useState<DashboardScreenState>('LOADING');
  const [role, setRole] = useState<WorkerRole | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [dashboardState, setDashboardState] = useState<DashboardDataState>('EMPTY');
  const [tasks, setTasks] = useState<DashboardTaskItem[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function resolveContext(): Promise<WorkContextNavigationState | null> {
      const navState = location.state as WorkContextNavigationState | null;
      if (navState?.companyId && navState?.branchId) {
        return navState;
      }

      // Sin estado de navegacion (recarga directa de /tablero, o llegada
      // por URL) - se resuelve igual que useLogin.ts: 1 sola asignacion
      // se usa directo, mas de 1 vuelve a TR-05, 0 se trata como
      // contexto no resuelto (defensivo, nunca bloquea con un error).
      const user = getFirebaseAuth().currentUser;
      if (!user) return null;
      try {
        const idToken = await user.getIdToken();
        const assignments = await getWorkContextAssignments(idToken);
        if (assignments.length === 1) {
          const only = assignments[0];
          return {
            companyId: only.companyId,
            companyName: only.companyName,
            branchId: only.branchId,
            branchName: only.branchName,
          };
        }
        if (assignments.length > 1) {
          navigate('/seleccion-empresa-sede', { replace: true });
        }
        return null;
      } catch {
        return null;
      }
    }

    async function load() {
      const context = await resolveContext();
      if (cancelled) return;
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
        setCompanyName(context.companyName);
        setBranchName(context.branchName);
        setCompanyId(context.companyId);
        setBranchId(context.branchId);
        setDashboardState(result.state);
        setTasks(result.state === 'READY' ? result.tasks : []);
        setState('READY');
      } catch {
        if (!cancelled) setState('UNRESOLVED');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [location.state, navigate]);

  return { state, role, companyName, branchName, dashboardState, tasks, companyId, branchId };
}
