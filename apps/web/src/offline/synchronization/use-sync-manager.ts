import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPendingEvidence,
  getPendingEvidenceForReturn,
  markEvidenceSynced,
  markEvidenceFailed,
  getUnreportedEvidence,
  markEvidenceReported,
  ensureEvidenceHash,
} from '../queue/evidence-upload-queue';
import {
  clearSyncedDraft,
  getSyncDraft,
  getUnsentFieldEdits,
  markFieldEditsSent,
} from '../queue/sync-draft-store';
import { syncChecklist, type SyncChecklistRequest, type SyncChecklistResult } from '../../app/sync/sync-client';
import { describeSyncError } from '../../app/sync/sync-errors';
import { computeContentHash } from './content-hash';
import { getDeviceId } from '../database/device-id';
import {
  requestEvidenceUploadSession,
  uploadEvidenceToGcs,
  recordEvidence,
} from '../../app/rentals/rentals-documents-client';
import type { RentalEvidenceContentType } from '../../app/rentals/rentals-documents-client';
import {
  requestReturnEvidenceUploadSession,
  uploadReturnEvidenceToGcs,
  recordReturnEvidence,
} from '../../app/returns/returns-evidence-client';
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
  /** Llamado tras cada POST /sync (SYNCED o SYNC_CONFLICT confirmado por el servidor). */
  onServerSync?: (result: SyncChecklistResult) => void;
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
  /** Llamado tras cada POST /sync (SYNCED o SYNC_CONFLICT confirmado por el servidor). */
  onServerSync?: (result: SyncChecklistResult) => void;
}

export type SyncManagerParams = SyncManagerParamsRental | SyncManagerParamsReturn;

export interface SyncManagerResult {
  syncing: boolean;
  pendingCount: number;
  failedCount: number;
  triggerSync: () => void;
  refreshCounts: () => Promise<void>;
  /** Mensaje de negocio del ultimo fallo de POST /sync (null si no hubo). Los metadatos se reintentan solos. */
  syncError?: string | null;
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
  const onServerSync = params.onServerSync;

  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
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
    void Promise.resolve().then(refreshCounts);
  }, [refreshCounts]);

  /**
   * sync.yaml: tras subir los archivos, informa al servidor los metadatos (clientCaptureId, slot, contentHash...) y
   * las ediciones de campos del borrador. El SERVIDOR decide SYNCED o SYNC_CONFLICT; aqui no se resuelve nada.
   * Devuelve true si el servidor respondio.
   */
  const reportToServer = useCallback(async (): Promise<boolean> => {
    const sourceId = rentalId ?? returnId;
    if (!sourceId || !companyId || !branchId) return false;
    const checklistType = rentalId ? 'ENTREGA' : 'RECEPCION';
    const unreported = (await getUnreportedEvidence(rentalId ? { rentalId } : { returnId })).filter(
      (i) => i.id !== undefined && i.clientCaptureId,
    );
    const edits = await getUnsentFieldEdits(checklistType, sourceId);
    if (unreported.length === 0 && edits.length === 0) return false;

    const draft = await getSyncDraft(checklistType, sourceId);
    const candidates = [draft?.draftCreatedAt, ...unreported.map((i) => i.draftCreatedAt)].filter(
      (v): v is string => Boolean(v),
    );
    const draftCreatedAt = candidates.sort()[0] ?? new Date().toISOString();

    const evidence: SyncChecklistRequest['evidence'] = [];
    for (const item of unreported) {
      evidence.push({
        clientCaptureId: item.clientCaptureId as string,
        zone: item.zone,
        slot: item.slot ?? 1,
        type: item.type,
        contentHash: await ensureEvidenceHash(item),
        sizeBytes: item.blob.size,
        capturedAt: new Date(item.createdAt).toISOString(),
        deviceId: item.deviceId,
      });
    }
    const fields: SyncChecklistRequest['fields'] = edits.map((e) => ({
      key: e.key,
      ...(e.dataType ? { dataType: e.dataType } : {}),
      value: e.value,
      baseRev: e.baseRev,
      editedAt: e.editedAt,
    }));

    try {
      const idToken = await getIdToken();
      // El contrato limita 100 evidencias por llamada: los campos viajan en la primera.
      for (let from = 0; from === 0 || from < evidence.length; from += 100) {
        const body: SyncChecklistRequest = {
          companyId,
          branchId,
          deviceId: getDeviceId(),
          draftCreatedAt,
          fields: from === 0 ? fields : [],
          evidence: evidence.slice(from, from + 100),
        };
        // Misma carga => misma Idempotency-Key: un reintento no duplica conflictos ni evidencia.
        const key = `sync-${(await computeContentHash(new Blob([JSON.stringify(body)]))).slice(0, 40)}`;
        const result = await syncChecklist(idToken, checklistType, sourceId, body, key);
        onServerSync?.(result);
        if (result.status === 'SYNCED') await clearSyncedDraft(checklistType, sourceId);
      }
      await markEvidenceReported(unreported.map((i) => i.id as number));
      await markFieldEditsSent(checklistType, sourceId, edits.map((e) => e.key));
      setSyncError(null);
      return true;
    } catch (err) {
      setSyncError(describeSyncError(err, 'No pudimos informar la sincronización al servidor. Se reintentará al volver la conexión.'));
      return false;
    }
  }, [rentalId, returnId, companyId, branchId, getIdToken, onServerSync]);

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
          // DEV-04 usa el returnId (endpoints /returns/{id}/evidence); ALQ-09 el rentalId
          // (endpoints /rentals/{id}/evidence). Mismo flujo, distinto recurso.
          const resourceId = item.rentalId ?? item.returnId ?? rentalId ?? returnId;
          if (!resourceId) continue;

          try {
            const idToken = await getIdToken();
            const zone = item.zone;
            const file = item.blob as File;
            // item.blob es siempre un File (capturado desde <input type="file">);
            // el tipo EvidenceQueueItem declara Blob por compatibilidad con la interfaz de Dexie.
            if (item.returnId && !item.rentalId) {
              // DEV-04: mismo flujo de 3 pasos, pero contra /returns/{id}/evidence.
              const session = await requestReturnEvidenceUploadSession(
                idToken,
                resourceId,
                companyId,
                branchId,
                item.type,
                zone,
                item.mimeType as Parameters<typeof requestReturnEvidenceUploadSession>[6],
                item.blob.size,
              );
              await uploadReturnEvidenceToGcs(session.uploadUrl, file);
              await recordReturnEvidence(idToken, resourceId, companyId, branchId, item.type, zone, session.objectUrl);
            } else {
              const session = await requestEvidenceUploadSession(
                idToken,
                resourceId,
                companyId,
                branchId,
                item.type,
                zone as Parameters<typeof requestEvidenceUploadSession>[5],
                item.mimeType as RentalEvidenceContentType,
                item.blob.size,
              );
              await uploadEvidenceToGcs(session.uploadUrl, file);
              await recordEvidence(
                idToken,
                resourceId,
                companyId,
                branchId,
                item.type,
                zone as Parameters<typeof recordEvidence>[5],
                session.objectUrl,
              );
            }
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

        const reported = await reportToServer();
        await refreshCounts();
        if (syncedCount > 0 || reported) onComplete?.();
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    })();
  }, [rentalId, returnId, companyId, branchId, getIdToken, getPending, refreshCounts, onComplete, reportToServer]);

  useEffect(() => {
    const handleOnline = () => triggerSync();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [triggerSync]);

  return { syncing, pendingCount, failedCount, triggerSync, refreshCounts, syncError };
}
