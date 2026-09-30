import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getDashboard } from '../dashboard/dashboard-client';
import { getWorkContextAssignments } from '../auth/work-context-client';
import type { WorkerRole } from '../dashboard/worker-role';
import { useWorkSession } from '../shared/useWorkSession';

/**
 * TR-11 (HU-25) - estados del hub de módulos de navegación.
 * Resolución de contexto: idéntica a useDashboard (TR-06); se reutiliza
 * getDashboard para obtener el rol sin necesidad de un endpoint propio.
 * Plan Bloque 3: "HU-25 es solo frontend — no requiere endpoint nuevo".
 */
export type ModuleHubState = 'LOADING' | 'READY' | 'UNRESOLVED';

interface NavigationState {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

export function useModuleHub() {
  const [state, setState] = useState<ModuleHubState>('LOADING');
  const [role, setRole] = useState<WorkerRole | null>(null);
  const { setRole: setSessionRole } = useWorkSession();
  const [branchLabel, setBranchLabel] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function resolveContext(): Promise<NavigationState | null> {
      const navState = location.state as NavigationState | null;
      if (navState?.companyId && navState?.branchId) {
        return navState;
      }

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
        setSessionRole(result.role);
        setBranchLabel(`${context.companyName} — ${context.branchName}`);
        setCompanyId(context.companyId);
        setBranchId(context.branchId);
        setState('READY');
      } catch {
        if (!cancelled) setState('UNRESOLVED');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [location.state, navigate, setSessionRole]);

  return { state, role, branchLabel, companyId, branchId };
}
