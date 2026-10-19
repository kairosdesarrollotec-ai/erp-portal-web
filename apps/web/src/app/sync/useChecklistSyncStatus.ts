import { useCallback, useEffect, useRef, useState } from 'react';
import { getChecklistSyncStatus, type SyncChecklistStatusResponse, type SyncChecklistType } from './sync-client';
import { describeSyncError } from './sync-errors';

export interface UseChecklistSyncStatusParams {
  checklistType: SyncChecklistType;
  sourceId: string | null | undefined;
  companyId: string | undefined;
  branchId: string | undefined;
  getIdToken: () => Promise<string>;
  /** Solo consulta con conexion (el estado SYNCED lo confirma siempre el servidor). */
  enabled: boolean;
}

export interface ChecklistSyncStatus {
  /** Ultima respuesta de GET /sync/checklists/... */
  data: SyncChecklistStatusResponse | null;
  /** La consulta respondio con exito. */
  loaded: boolean;
  /** Mensaje de negocio si la consulta fallo. */
  error: string | null;
  /** Vuelve a consultar al servidor (tras sincronizar o resolver). */
  reload: () => Promise<void>;
}

/** Estado de sincronizacion confirmado por el servidor para ENTREGA-04 / DEV-04 (sync.yaml). */
export function useChecklistSyncStatus(params: UseChecklistSyncStatusParams): ChecklistSyncStatus {
  const { checklistType, sourceId, companyId, branchId, getIdToken, enabled } = params;
  const [data, setData] = useState<SyncChecklistStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const getTokenRef = useRef(getIdToken);
  useEffect(() => {
    getTokenRef.current = getIdToken;
  });

  const reload = useCallback(async () => {
    if (!enabled || !sourceId || !companyId || !branchId) return;
    const mine = ++seq.current;
    try {
      const idToken = await getTokenRef.current();
      const result = await getChecklistSyncStatus(idToken, checklistType, sourceId, companyId, branchId);
      if (mine !== seq.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (mine !== seq.current) return;
      setData(null);
      setError(describeSyncError(err, 'No pudimos consultar el estado de sincronización con el servidor.'));
    }
  }, [enabled, checklistType, sourceId, companyId, branchId]);

  useEffect(() => {
    const counter = seq;
    void reload();
    return () => {
      counter.current++;
    };
  }, [reload]);

  return { data, loaded: data !== null, error, reload };
}
