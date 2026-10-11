import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPendingEvidence,
  getPendingEvidenceForReturn,
  markEvidenceSynced,
  markEvidenceFailed,
} from '../queue/evidence-upload-queue';
import {
  requestEvidenceUploadSession,
  uploadEvidenceToGcs,
  recordEvidence,
} from '../../app/rentals/rentals-documents-client';
import type { RentalEvidenceContentType } from '../../app/rentals/rentals-documents-client';
import type { EvidenceQueueItem } from '../database/kairos-db';

/** Parámetros para ALQ-09 (alquiler) */
interface SyncManagerParamsRental {
  rentalId: string | null;
  returnId?: undefined;
  companyId: string;
  branchId: string;
  getIdToken: () => Promise<string>;
  /** Llamado tras sincronizar al menos un item exitosamente. */
  onSyncComplete?: () => void;
  /** Alias para onSyncComplete (compatibilidad). */
  onSynced?: () => void;
}

/** Parámetros para DEV-04 (devolución) */
interface SyncManagerParamsReturn {
  returnId: string | null;
  rentalId?: undefined;
  companyId: string;
  branchId: string;
  getIdToken: () => Promise<string>;
  /** Llamado tras sincronizar al menos un item exitosamente. */
  onSyncComplete?: () => void;
  /** Alias para onSyncComplete (compatibilidad). */
  onSynced?: () => void;
}

export type SyncManagerParams = SyncManagerParamsRental | SyncManagerParamsReturn;

export interface SyncManagerResult {
  syncing: boolean;
  pendingCount: number;
  failedCount: number;
  triggerSync: () => void;
  refreshCounts: () => Promise<void>;
}

/** Alias para compatibilidad con tests existentes. */
export type UseSyncManagerResult = SyncManagerResult;

/**
 * ALQ-09 / DEV-04 / ADR-KAI-004: Escucha el evento `online` y sube items
 * pendientes de la cola Dexie al servidor vía
 * requestEvidenceUploadSession → uploadEvidenceToGcs → recordEvidence.
 *
 * Acepta `rentalId` (ALQ-09) o `returnId` (DEV-04).
 */
export function useSyncManager(params: SyncManagerParams): SyncManagerResult {
  const { companyId, branchId, getIdToken } = params;
  const rentalId = 'rentalId' in params ? (params.rentalId ?? null) : null;
  const returnId = 'returnId' in params ? (params.returnId ?? null) : null;
  const onComplete = params.onSyncComplete ?? params.onSynced;

  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const syncingRef = useRef(false);

  const getPending = useCallback((): Promise<EvidenceQueueItem[]> => {
    if (rentalId) return getPendingEvidence(rentalId);
    if (returnId) return getPendingEvidenceForReturn(returnId);
    return Promise.resolve([]);
  }, [rentalId, returnId]);

  const refreshCounts = useCallback(async () => {
    const items = await getPending();
    setPendingCount(items.filter((i) => i.status === 'pending').length);
    setFailedCount(items.filter((i) => i.status === 'error').length);
  }, [getPending]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  const triggerSync = useCallback(() => {
    if (syncingRef.current) return;
    if (!rentalId && !returnId) return;

    syncingRef.current = true;
    setSyncing(true);

    void (async () => {
      try {
        const items = await getPending();
        let syncedCount = 0;

        for (const item of items) {
          if (item.id === undefined) continue;
          // Para DEV-04 usamos el returnId como identificador de recurso;
          // para ALQ-09 usamos el rentalId. Ambos se sincronizan al mismo endpoint.
          const resourceId = item.rentalId ?? item.returnId ?? rentalId ?? returnId;
          if (!resourceId) continue;

          try {
            const idToken = await getIdToken();
            const session = await requestEvidenceUploadSession(
              idToken,
              resourceId,
              companyId,
              branchId,
              item.type,
              item.zone as Parameters<typeof requestEvidenceUploadSession>[5],
              item.mimeType as RentalEvidenceContentType,
              item.blob.size,
            );
            // item.blob es siempre un File (capturado desde <input type="file">);
            // el tipo EvidenceQueueItem declara Blob por compatibilidad con la interfaz de Dexie.
            await uploadEvidenceToGcs(session.uploadUrl, item.blob as File);
            await recordEvidence(
              idToken,
              resourceId,
              companyId,
              branchId,
              item.type,
              item.zone as Parameters<typeof recordEvidence>[5],
              session.objectUrl,
            );
            await markEvidenceSynced(item.id);
            syncedCount++;
          } catch (err) {
            if (item.id !== undefined) {
              await markEvidenceFailed(
                item.id,
                err instanceof Error ? err.message : 'Error desconocido',
              );
            }
          }
        }

        await refreshCounts();
        if (syncedCount > 0) onComplete?.();
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    })();
  }, [rentalId, returnId, companyId, branchId, getIdToken, getPending, refreshCounts, onComplete]);

  useEffect(() => {
    const handleOnline = () => triggerSync();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [triggerSync]);

  return { syncing, pendingCount, failedCount, triggerSync, refreshCounts };
}
