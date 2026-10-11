import { kairosDb, type EvidenceQueueItem } from '../database/kairos-db';

/** Agrega un item de evidencia a la cola local offline. `status` y `createdAt` son opcionales y se auto-rellenan. */
export async function addEvidenceToQueue(
  item: Omit<EvidenceQueueItem, 'id' | 'status' | 'createdAt'> & Partial<Pick<EvidenceQueueItem, 'status' | 'createdAt'>>,
): Promise<number> {
  return kairosDb.evidence_queue.add({
    ...item,
    status: item.status ?? 'pending',
    createdAt: item.createdAt ?? Date.now(),
  });
}

/** Obtiene items pendientes (pending/error) para un alquiler. */
export async function getPendingEvidence(rentalId: string): Promise<EvidenceQueueItem[]> {
  return kairosDb.evidence_queue
    .where('rentalId')
    .equals(rentalId)
    .filter((item) => item.status === 'pending' || item.status === 'error' || item.status === 'syncing')
    .toArray();
}

/** Obtiene items pendientes para una devolución. */
export async function getPendingEvidenceForReturn(returnId: string): Promise<EvidenceQueueItem[]> {
  return kairosDb.evidence_queue
    .where('returnId')
    .equals(returnId)
    .filter((item) => item.status === 'pending' || item.status === 'error' || item.status === 'syncing')
    .toArray();
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
