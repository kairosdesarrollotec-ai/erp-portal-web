import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getWorkContextAssignments } from '../auth/work-context-client';
import { usePermissionsStore } from './usePermissions';
import { isNetworkFailure, recallContext } from '../../offline/session/offline-session';

interface ContextState {
  companyId?: string;
  branchId?: string;
}

/**
 * Mantiene cargados los permisos efectivos del contexto de trabajo vigente.
 *  - Con contexto en la navegacion (location.state) los (re)carga cuando cambia
 *    empresa/sede.
 *  - Sin contexto (recarga directa por URL) y aun sin permisos cargados, lo
 *    resuelve por asignaciones igual que useWorkContextFor*: solo si hay UNA
 *    asignacion; con varias, cada pantalla ya redirige a TR-05.
 * La carga es idempotente (usePermissionsStore.load no repite la misma llamada).
 */
export function useSyncPermissionsWithContext(): void {
  const location = useLocation();
  const { companyId, branchId } = (location.state ?? {}) as ContextState;

  useEffect(() => {
    const { load, status } = usePermissionsStore.getState();

    if (companyId && branchId) {
      void load({ companyId, branchId });
      return;
    }
    if (status !== 'idle') return;

    let cancelled = false;
    void (async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        const assignments = await getWorkContextAssignments(idToken);
        if (cancelled || assignments.length !== 1) return;
        if (usePermissionsStore.getState().status !== 'idle') return;
        await usePermissionsStore.getState().load({
          companyId: assignments[0].companyId,
          branchId: assignments[0].branchId,
        });
      } catch (error) {
        // V-27: sin red, el contexto de la última verificación (≤ 8 h) permite cargar los permisos guardados.
        if (isNetworkFailure(error)) {
          const stored = await recallContext();
          if (cancelled || !stored) return;
          if (usePermissionsStore.getState().status !== 'idle') return;
          await usePermissionsStore.getState().load({ companyId: stored.companyId, branchId: stored.branchId });
        }
        // Sin contexto resuelto los permisos siguen sin cargar (deny-by-default).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, branchId]);

  // V-27: al volver la conexión, los permisos tomados de la copia local se reemplazan por los del servidor.
  useEffect(() => {
    const refresh = () => {
      const { fromSnapshot, contextKey, load } = usePermissionsStore.getState();
      if (!fromSnapshot || !contextKey) return;
      const [storedCompanyId, storedBranchId] = contextKey.split(':');
      void load({ companyId: storedCompanyId, branchId: storedBranchId }, { force: true });
    };
    window.addEventListener('online', refresh);
    return () => window.removeEventListener('online', refresh);
  }, []);
}
