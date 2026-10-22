import { useQuery } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkContextForAdmin } from '../admin/useWorkContextForAdmin';
import { usePermissions } from '../shared/usePermissions';
import { listEvidenceDeletionRequests, type EvidenceDeletionRequest } from './evidence-client';

export type RequestsTab = 'PENDING_MINE' | 'MINE' | 'ALL';

export type RequestsScreenState = 'LOADING' | 'FORBIDDEN' | 'NO_CONTEXT' | 'RECOVERABLE_ERROR' | 'EMPTY' | 'READY';

/** Funcion pura: aplica la pestana a la lista (el estado `viewer` lo calcula el back para el usuario que consulta). */
export function filterByTab(requests: EvidenceDeletionRequest[], tab: RequestsTab, myUid: string | null): EvidenceDeletionRequest[] {
  if (tab === 'ALL') return requests;
  if (tab === 'MINE') return requests.filter((r) => myUid !== null && r.requestedBy === myUid);
  return requests.filter((r) => (r.status === 'PENDING' || r.status === 'APPROVED_1') && (r.viewer.canApprove || r.viewer.canReject));
}

/**
 * Bandeja de solicitudes de eliminacion de evidencia (doble aprobacion). Consulta exige EVIDENCE.REQUEST_DELETION o
 * EVIDENCE.APPROVE_DELETION; sin ninguno -> FORBIDDEN (y un 403 del back tambien).
 */
export function useEvidenceDeletionRequests(tab: RequestsTab) {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const { can, ready } = usePermissions();
  const allowed = ready && (can('EVIDENCE', 'REQUEST_DELETION') || can('EVIDENCE', 'APPROVE_DELETION'));
  const canApprove = ready && can('EVIDENCE', 'APPROVE_DELETION');

  const query = useQuery({
    queryKey: ['evidence-deletion-requests', context?.companyId, context?.branchId] as const,
    enabled: allowed && !!context,
    retry: false,
    queryFn: async (): Promise<EvidenceDeletionRequest[]> => {
      const user = getFirebaseAuth().currentUser;
      if (!user || !context) throw new Error('Sesión o contexto no disponible.');
      const idToken = await user.getIdToken();
      return listEvidenceDeletionRequests(idToken, { companyId: context.companyId, branchId: context.branchId, limit: 200 });
    },
  });

  const myUid = getFirebaseAuth().currentUser?.uid ?? null;
  const all = query.data ?? [];
  const visible = filterByTab(all, tab, myUid);
  const forbiddenByServer = (query.error as { status?: number } | null)?.status === 403;

  let state: RequestsScreenState;
  if (contextLoading || !ready) state = 'LOADING';
  else if (!allowed || forbiddenByServer) state = 'FORBIDDEN';
  else if (!context) state = 'NO_CONTEXT';
  else if (query.isLoading) state = 'LOADING';
  else if (query.isError) state = 'RECOVERABLE_ERROR';
  else state = visible.length === 0 ? 'EMPTY' : 'READY';

  return { state, context, requests: visible, canApprove, myUid, reload: () => void query.refetch() };
}
