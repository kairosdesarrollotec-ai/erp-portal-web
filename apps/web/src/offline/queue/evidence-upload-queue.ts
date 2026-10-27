import { kairosDb, type EvidenceQueueItem } from '../database/kairos-db';
import { getDeviceId } from '../database/device-id';
import { computeContentHash } from '../synchronization/content-hash';
import { ensureSyncDraft } from './sync-draft-store';
import { sealEvidenceRow, unsealEvidenceRow, unsealMany } from '../crypto/sealed-store';

type NewQueueItem = Omit<EvidenceQueueItem, 'id' | 'status' | 'createdAt'> & Partial<Pick<EvidenceQueueItem, 'status' | 'createdAt'>>;

function newCaptureId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
}

/**
 * Agrega un item de evidencia a la cola local offline. `status` y `createdAt` son opcionales y se auto-rellenan.
 * Ademas completa los metadatos de sync.yaml: clientCaptureId, slot (siguiente toma de la zona en el expediente),
 * contentHash (SHA-256), baseRev 0, draftCreatedAt (ancla del borrador, TTL 72 h) y deviceId.
 */
export async function addEvidenceToQueue(item: NewQueueItem): Promise<number> {
  const checklistType = item.rentalId ? 'ENTREGA' : item.returnId ? 'RECEPCION' : null;
  const sourceId = item.rentalId ?? item.returnId;
  const createdAt = item.createdAt ?? Date.now();

  let draftCreatedAt = item.draftCreatedAt;
  if (!draftCreatedAt && checklistType && sourceId) {
    draftCreatedAt = (await ensureSyncDraft(checklistType, sourceId, new Date(createdAt))).draftCreatedAt;
  }

  let slot = item.slot;
  if (slot === undefined && sourceId) {
    const sameScope = await kairosDb.evidence_queue
      .where(item.rentalId ? 'rentalId' : 'returnId')
      .equals(sourceId)
      .filter((q) => q.zone === item.zone)
      .toArray();
    slot = sameScope.reduce((max, q) => Math.max(max, q.slot ?? 0), 0) + 1;
  }

  let contentHash = item.contentHash;
  if (!contentHash) {
    try {
      contentHash = await computeContentHash(item.blob);
    } catch {
      contentHash = undefined; // se reintenta al sincronizar
    }
  }

  // SDD-00 §17.4: la foto/video se guarda cifrada; el hash se calculo arriba sobre el contenido en claro.
  return kairosDb.evidence_queue.add(await sealEvidenceRow({
    ...item,
    status: item.status ?? 'pending',
    createdAt,
    clientCaptureId: item.clientCaptureId ?? newCaptureId(),
    slot: slot ?? 1,
    contentHash,
    baseRev: item.baseRev ?? 0,
    draftCreatedAt: draftCreatedAt ?? new Date(createdAt).toISOString(),
    deviceId: item.deviceId ?? getDeviceId(),
  }));
}

/** Completa y persiste el contentHash de un item que se encolo sin el (p.ej. migrado de v1). */
export async function ensureEvidenceHash(item: EvidenceQueueItem): Promise<string> {
  if (item.contentHash) return item.contentHash;
  const hash = await computeContentHash(item.blob);
  if (item.id !== undefined) await kairosDb.evidence_queue.update(item.id, { contentHash: hash });
  return hash;
}

/** Items ya subidos (synced) cuyos metadatos aun no recibio el servidor via /sync. */
export async function getUnreportedEvidence(scope: { rentalId?: string | null; returnId?: string | null }): Promise<EvidenceQueueItem[]> {
  const index = scope.rentalId ? 'rentalId' : scope.returnId ? 'returnId' : null;
  const value = scope.rentalId ?? scope.returnId;
  if (!index || !value) return [];
  const rows = await kairosDb.evidence_queue
    .where(index)
    .equals(value)
    .filter((q) => q.status === 'synced' && !q.reportedAt)
    .toArray();
  return unsealMany(rows, unsealEvidenceRow);
}

/** Guarda el slot definitivo que informo el servidor (`evidenceSlots`) para cada captura; ignora las desconocidas. */
export async function markEvidenceSlots(
  scope: { rentalId?: string | null; returnId?: string | null },
  slots: readonly { clientCaptureId: string; slot: number; outcome?: string }[],
): Promise<void> {
  const index = scope.rentalId ? 'rentalId' : scope.returnId ? 'returnId' : null;
  const value = scope.rentalId ?? scope.returnId;
  if (!index || !value || slots.length === 0) return;
  const items = await kairosDb.evidence_queue.where(index).equals(value).toArray();
  await Promise.all(
    slots
      .filter((s) => s.outcome !== 'CONFLICT')
      .map((s) => {
        const item = items.find((i) => i.clientCaptureId === s.clientCaptureId);
        return item?.id !== undefined ? kairosDb.evidence_queue.update(item.id, { serverSlot: s.slot }) : undefined;
      }),
  );
}

/** Marca como reportados al servidor (evita reenviarlos). */
export async function markEvidenceReported(ids: readonly number[], now: Date = new Date()): Promise<void> {
  await Promise.all(ids.map((id) => kairosDb.evidence_queue.update(id, { reportedAt: now.toISOString() })));
}

/** Obtiene items pendientes (pending/error) para un alquiler. */
export async function getPendingEvidence(rentalId: string): Promise<EvidenceQueueItem[]> {
  const rows = await kairosDb.evidence_queue
    .where('rentalId')
    .equals(rentalId)
    .filter((item) => item.status === 'pending' || item.status === 'error' || item.status === 'syncing')
    .toArray();
  return unsealMany(rows, unsealEvidenceRow);
}

/** Obtiene items pendientes para una devolución. */
export async function getPendingEvidenceForReturn(returnId: string): Promise<EvidenceQueueItem[]> {
  const rows = await kairosDb.evidence_queue
    .where('returnId')
    .equals(returnId)
    .filter((item) => item.status === 'pending' || item.status === 'error' || item.status === 'syncing')
    .toArray();
  return unsealMany(rows, unsealEvidenceRow);
}

/** Marca un item como sincronizado con el servidor. */
export async function markEvidenceSynced(id: number): Promise<void> {
  await kairosDb.evidence_queue.update(id, { status: 'synced' });
}

/** Marca un item como fallido con el mensaje de error. */
export async function markEvidenceFailed(id: number, msg: string): Promise<void> {
  await kairosDb.evidence_queue.update(id, { status: 'error', errorMsg: msg });
}

/** Cuenta todos los items pendientes (cualquier alquiler/devolución). */
export async function countPendingAll(): Promise<number> {
  return kairosDb.evidence_queue
    .filter((item) => item.status === 'pending' || item.status === 'error' || item.status === 'syncing')
    .count();
}

/** Elimina los items ya sincronizados para un alquiler. */
export async function clearSyncedEvidence(rentalId: string): Promise<void> {
  const synced = await kairosDb.evidence_queue
    .where('rentalId')
    .equals(rentalId)
    .filter((item) => item.status === 'synced')
    .toArray();
  const ids = synced.map((item) => item.id).filter((id): id is number => id !== undefined);
  await kairosDb.evidence_queue.bulkDelete(ids);
}
