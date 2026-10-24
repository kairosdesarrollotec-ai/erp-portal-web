import { useQuery } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkContextForAdmin } from '../admin/useWorkContextForAdmin';
import { usePermissions } from '../shared/usePermissions';
import { canSyncAction } from './sync-permissions';
import { listSyncConflicts, type SyncChecklistType, type SyncConflict } from './sync-client';

export type SyncCenterStatusFilter = 'OPEN' | 'RESOLVED' | 'ALL';

const CHECKLIST_TYPES: SyncChecklistType[] = ['ENTREGA', 'RECEPCION'];

/** Criterio de supervisor del Centro de sincronización: evalúa la acción propia SYNC.SUPERVISE_CONFLICTS de ADM-02. */
export function canSuperviseSync(can: (module: string, action: string) => boolean): boolean {
  return can('SYNC', 'SUPERVISE_CONFLICTS');
}

export type SyncCenterState = 'LOADING' | 'FORBIDDEN' | 'NO_CONTEXT' | 'RECOVERABLE_ERROR' | 'EMPTY' | 'READY';

/**
 * TR-08 Centro de sincronización: junta los conflictos de Entrega y Recepción (GET /sync/conflicts exige el tipo) de
 * los tipos que el usuario puede supervisar, filtrados por estado, los más recientes primero.
 */
export function useSyncCenter(statusFilter: SyncCenterStatusFilter) {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const { can, ready } = usePermissions();
  const isSupervisor = ready && canSuperviseSync(can);
  const types = CHECKLIST_TYPES.filter((type) => canSyncAction(can, type, 'RESOLVE'));
  const statuses: Array<'OPEN' | 'RESOLVED'> = statusFilter === 'ALL' ? ['OPEN', 'RESOLVED'] : [statusFilter];

  const query = useQuery({
    queryKey: ['sync-center', context?.companyId, context?.branchId, statusFilter, types.join(',')] as const,
    enabled: isSupervisor && !!context,
    retry: false,
    queryFn: async (): Promise<SyncConflict[]> => {
      const user = getFirebaseAuth().currentUser;
      if (!user || !context) throw new Error('Sesión o contexto no disponible.');
      const idToken = await user.getIdToken();
      const lists = await Promise.all(
        types.flatMap((checklistType) =>
          statuses.map((status) =>
            listSyncConflicts(idToken, { companyId: context.companyId, branchId: context.branchId, checklistType, status }),
          ),
        ),
      );
      return lists.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  });

  let state: SyncCenterState;
  if (contextLoading || !ready) state = 'LOADING';
  else if (!isSupervisor) state = 'FORBIDDEN';
  else if (!context) state = 'NO_CONTEXT';
  else if (query.isLoading) state = 'LOADING';
  else if (query.isError) state = 'RECOVERABLE_ERROR';
  else state = (query.data ?? []).length === 0 ? 'EMPTY' : 'READY';

  return { state, context, conflicts: query.data ?? [], reload: () => void query.refetch() };
}
