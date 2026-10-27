import { kairosDb, type SyncChecklistKind, type SyncFieldEditRow } from '../database/kairos-db';
import { getDeviceId } from '../database/device-id';
import { assertOfflineAllowed } from '../crypto/local-encryption';
import { sealFieldEditRow, unsealFieldEditRow, unsealMany } from '../crypto/sealed-store';

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
  assertOfflineAllowed(edit.dataType);
  await ensureSyncDraft(checklistType, sourceId, now);
  const previous = await kairosDb.sync_field_edits.get([checklistType, sourceId, edit.key]);
  // SDD-00 §17.4: el valor del campo se guarda cifrado (`valueSealed`); el resto son metadatos de sincronizacion.
  await kairosDb.sync_field_edits.put(
    await sealFieldEditRow({
      checklistType,
      sourceId,
      key: edit.key,
      dataType: edit.dataType ?? previous?.dataType,
      value: edit.value,
      baseRev: previous?.baseRev ?? 0,
      editedAt: now.toISOString(),
    }),
  );
}

/** Ediciones aun no enviadas al servidor. */
export async function getUnsentFieldEdits(checklistType: SyncChecklistKind, sourceId: string): Promise<SyncFieldEditRow[]> {
  const rows = await kairosDb.sync_field_edits.where('[checklistType+sourceId]').equals([checklistType, sourceId]).toArray();
  return unsealMany(
    rows.filter((r) => !r.sentAt),
    unsealFieldEditRow,
  );
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
 * sync.yaml 1.1.0 (DEC-SYNC-10): adopta la revision vigente que informa el servidor (respuesta de `sync` o GET status)
 * como `baseRev` de la SIGUIENTE edicion de cada campo, para que reeditar un campo ya sincronizado no choque contra
 * la propia edicion. Reglas de seguridad (nunca oculta un cambio ajeno ni pisa trabajo local):
 *  - solo toca campos que el dispositivo ya trackea y cuya edicion YA se envio (`sentAt`): una edicion local sin
 *    enviar conserva su `baseRev` (si no, se aplicaria por encima de un cambio ajeno que el usuario nunca vio);
 *  - no toca campos con conflicto abierto (`openConflictKeys`): los resuelve el supervisor;
 *  - `onlyEditedAt` (opcional) limita a las ediciones exactamente enviadas (evita pisar una reedicion hecha durante el POST);
 *  - si el valor del servidor difiere del enviado (p. ej. conflicto resuelto con "Conservar del servidor"), el registro
 *    pasa a reflejar el valor del servidor, siempre marcado como enviado.
 */
export async function applyServerFieldRevisions(
  checklistType: SyncChecklistKind,
  sourceId: string,
  revisions: readonly { key: string; rev: number; value: SyncFieldEditRow['value'] }[] | null | undefined,
  options: { openConflictKeys?: readonly string[]; onlyEditedAt?: Readonly<Record<string, string>> } = {},
): Promise<void> {
  if (!revisions || revisions.length === 0) return;
  const blocked = new Set(options.openConflictKeys ?? []);
  for (const revision of revisions) {
    if (blocked.has(revision.key)) continue;
    const row = await kairosDb.sync_field_edits.get([checklistType, sourceId, revision.key]);
    if (!row || !row.sentAt) continue;
    if (options.onlyEditedAt && options.onlyEditedAt[revision.key] !== row.editedAt) continue;
    const [current] = await unsealMany([row], unsealFieldEditRow);
    if (!current) continue; // fila ilegible: no se toca
    if (row.baseRev === revision.rev && current.value === revision.value) continue;
    await kairosDb.sync_field_edits.put(await sealFieldEditRow({ ...current, baseRev: revision.rev, value: revision.value }));
  }
}

/**
 * Olvida el ancla del borrador cuando el servidor confirmo SYNCED (la proxima captura abre un borrador nuevo con su
 * propio TTL). Las ediciones de campos se conservan; su `baseRev` se actualiza con la revision que entrega el servidor
 * (`applyServerFieldRevisions`, sync.yaml 1.1.0).
 */
export async function clearSyncedDraft(checklistType: SyncChecklistKind, sourceId: string): Promise<void> {
  await kairosDb.sync_drafts.delete([checklistType, sourceId]);
}
