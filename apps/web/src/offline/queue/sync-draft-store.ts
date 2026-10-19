import { kairosDb, type SyncChecklistKind, type SyncFieldEditRow } from '../database/kairos-db';
import { getDeviceId } from '../database/device-id';

/**
 * Borrador offline del checklist (sync.yaml): ancla `draftCreatedAt` (TTL 72 h del servidor) y guarda las ediciones
 * de campos con su `baseRev`. NO decide nada de conflictos: eso lo hace el servidor.
 */

/** Devuelve (creandolo si falta) el instante de creacion del borrador del expediente, ISO UTC. */
export async function ensureSyncDraft(
  checklistType: SyncChecklistKind,
  sourceId: string,
  now: Date = new Date(),
): Promise<{ draftCreatedAt: string; deviceId: string }> {
  const existing = await kairosDb.sync_drafts.get([checklistType, sourceId]);
  if (existing) return { draftCreatedAt: existing.draftCreatedAt, deviceId: existing.deviceId };
  const row = { checklistType, sourceId, draftCreatedAt: now.toISOString(), deviceId: getDeviceId() };
  await kairosDb.sync_drafts.put(row);
  return { draftCreatedAt: row.draftCreatedAt, deviceId: row.deviceId };
}

export async function getSyncDraft(checklistType: SyncChecklistKind, sourceId: string) {
  return kairosDb.sync_drafts.get([checklistType, sourceId]);
}

/** Guarda la edicion offline de un campo; conserva el `baseRev` ya conocido (0 = nunca sincronizado). */
export async function saveFieldEdit(
  checklistType: SyncChecklistKind,
  sourceId: string,
  edit: Pick<SyncFieldEditRow, 'key' | 'value'> & Partial<Pick<SyncFieldEditRow, 'dataType'>>,
  now: Date = new Date(),
): Promise<void> {
  await ensureSyncDraft(checklistType, sourceId, now);
  const previous = await kairosDb.sync_field_edits.get([checklistType, sourceId, edit.key]);
  await kairosDb.sync_field_edits.put({
    checklistType,
    sourceId,
    key: edit.key,
    dataType: edit.dataType ?? previous?.dataType,
    value: edit.value,
    baseRev: previous?.baseRev ?? 0,
    editedAt: now.toISOString(),
  });
}

/** Ediciones aun no enviadas al servidor. */
export async function getUnsentFieldEdits(checklistType: SyncChecklistKind, sourceId: string): Promise<SyncFieldEditRow[]> {
  const rows = await kairosDb.sync_field_edits.where('[checklistType+sourceId]').equals([checklistType, sourceId]).toArray();
  return rows.filter((r) => !r.sentAt);
}

export async function markFieldEditsSent(
  checklistType: SyncChecklistKind,
  sourceId: string,
  keys: readonly string[],
  now: Date = new Date(),
): Promise<void> {
  await Promise.all(
    keys.map((key) => kairosDb.sync_field_edits.update([checklistType, sourceId, key], { sentAt: now.toISOString() })),
  );
}

/**
 * Olvida el ancla del borrador cuando el servidor confirmo SYNCED (la proxima captura abre un borrador nuevo con su
 * propio TTL). Las ediciones de campos se conservan con su `baseRev`: el contrato no entrega la revision nueva del
 * campo, por eso no se inventa (ver pregunta de negocio/contrato en el reporte).
 */
export async function clearSyncedDraft(checklistType: SyncChecklistKind, sourceId: string): Promise<void> {
  await kairosDb.sync_drafts.delete([checklistType, sourceId]);
}
