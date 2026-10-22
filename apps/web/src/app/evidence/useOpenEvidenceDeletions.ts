import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { usePermissions } from '../shared/usePermissions';
import {
  listEvidenceDeletionRequests,
  type EvidenceDeletionRequest,
  type EvidenceDeletionTargetKind,
} from './evidence-client';

interface Scope {
  companyId: string;
  branchId: string;
}

/** ¿El usuario puede consultar solicitudes de eliminacion? (solicitar o aprobar; el back exige cualquiera de los dos). */
export function useCanSeeEvidenceDeletions(): boolean {
  const { can, ready } = usePermissions();
  return ready && (can('EVIDENCE', 'REQUEST_DELETION') || can('EVIDENCE', 'APPROVE_DELETION'));
}

/**
 * Solicitudes de eliminacion ABIERTAS (PENDING / APPROVED_1) de un alquiler o una devolucion, por `evidenceId`, para
 * pintar "Eliminación solicitada" junto a cada archivo. Si el usuario no tiene permisos de evidencia, o la consulta
 * falla, no muestra nada (el checklist nunca se bloquea por esto).
 */
export function useOpenEvidenceDeletions(scope: Scope | null, targetKind: EvidenceDeletionTargetKind, targetId: string | undefined) {
  const allowed = useCanSeeEvidenceDeletions();
  const [byEvidence, setByEvidence] = useState<Record<string, EvidenceDeletionRequest>>({});
  const companyId = scope?.companyId;
  const branchId = scope?.branchId;

  const reload = useCallback(async () => {
    if (!allowed || !companyId || !branchId || !targetId) return;
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const [pending, approved] = await Promise.all([
        listEvidenceDeletionRequests(idToken, { companyId, branchId, targetKind, status: 'PENDING', limit: 200 }),
        listEvidenceDeletionRequests(idToken, { companyId, branchId, targetKind, status: 'APPROVED_1', limit: 200 }),
      ]);
      const map: Record<string, EvidenceDeletionRequest> = {};
      for (const request of [...pending, ...approved]) {
        if (request.targetKind === targetKind && request.targetId === targetId) map[request.evidenceId] = request;
      }
      setByEvidence(map);
    } catch {
      setByEvidence({});
    }
  }, [allowed, companyId, branchId, targetKind, targetId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  /** Registra de inmediato la solicitud recien creada (sin esperar al refresco). */
  const track = useCallback((request: EvidenceDeletionRequest) => {
    setByEvidence((prev) => ({ ...prev, [request.evidenceId]: request }));
  }, []);

  return { byEvidence, reload, track };
}
