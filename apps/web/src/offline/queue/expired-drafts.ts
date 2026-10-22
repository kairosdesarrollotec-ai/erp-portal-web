import { kairosDb, type SyncChecklistKind } from '../database/kairos-db';

/**
 * Respuestas de negocio 2026-10-20 #25: un borrador offline que no se termina en 72 h se BORRA (antes solo el servidor lo
 * rechazaba con SYNC_DRAFT_EXPIRED y los datos se quedaban para siempre en el dispositivo).
 *
 * Se borra, por expediente vencido:
 *  - el ancla del borrador (`sync_drafts`);
 *  - las ediciones de campos aun NO enviadas (`sync_field_edits`; las ya enviadas solo guardan la revision base);
 *  - las evidencias de la cola que no llegaron a subirse (pending / syncing / error).
 * Las evidencias ya subidas (`synced`) se conservan: el servidor ya las tiene y no son un borrador.
 */
export const DRAFT_TTL_MS = 72 * 60 * 60 * 1000;
/** Cada cuanto se vuelve a revisar mientras la app esta abierta. */
export const PURGE_INTERVAL_MS = 30 * 60 * 1000;

export interface PurgeResult {
  /** Expedientes cuyo borrador vencio y se borro. */
  drafts: number;
  /** Ediciones de campos sin enviar que se borraron. */
  fieldEdits: number;
  /** Fotos/videos pendientes que se borraron de la cola. */
  evidence: number;
}

function isExpired(isoOrMillis: string | number | undefined, now: number): boolean {
  if (isoOrMillis === undefined) return false;
  const created = typeof isoOrMillis === 'number' ? isoOrMillis : Date.parse(isoOrMillis);
  return Number.isFinite(created) && now - created >= DRAFT_TTL_MS;
}

export async function purgeExpiredDrafts(now: Date = new Date()): Promise<PurgeResult> {
  const nowMs = now.getTime();
  const result: PurgeResult = { drafts: 0, fieldEdits: 0, evidence: 0 };

  const drafts = await kairosDb.sync_drafts.toArray();
  const expired = drafts.filter((d) => isExpired(d.draftCreatedAt, nowMs));
  for (const draft of expired) {
    const key: [SyncChecklistKind, string] = [draft.checklistType, draft.sourceId];
    const edits = await kairosDb.sync_field_edits.where('[checklistType+sourceId]').equals(key).toArray();
    const unsent = edits.filter((e) => !e.sentAt);
    await kairosDb.sync_field_edits.bulkDelete(unsent.map((e) => [e.checklistType, e.sourceId, e.key]));
    await kairosDb.sync_drafts.delete(key);
    result.drafts += 1;
    result.fieldEdits += unsent.length;
  }

  // Evidencias sin subir cuyo borrador (o, en su defecto, su captura) ya paso las 72 h.
  const stale = await kairosDb.evidence_queue
    .filter((item) => item.status !== 'synced' && isExpired(item.draftCreatedAt ?? item.createdAt, nowMs))
    .toArray();
  const staleIds = stale.map((item) => item.id).filter((id): id is number => id !== undefined);
  if (staleIds.length > 0) await kairosDb.evidence_queue.bulkDelete(staleIds);
  result.evidence = staleIds.length;

  return result;
}

export function hasPurged(result: PurgeResult): boolean {
  return result.drafts + result.fieldEdits + result.evidence > 0;
}

/** Texto de negocio del aviso unico al usuario. */
export function describePurge(result: PurgeResult): string {
  const parts: string[] = [];
  if (result.evidence > 0) parts.push(`${result.evidence} foto(s) o video(s) sin subir`);
  if (result.fieldEdits > 0) parts.push(`${result.fieldEdits} dato(s) sin enviar`);
  const detail = parts.length > 0 ? ` (${parts.join(' y ')})` : '';
  return `Se borraron de este dispositivo ${result.drafts > 0 ? result.drafts : 'los'} borrador(es) que llevaban más de 72 horas sin terminarse${detail}. Si todavía los necesitas, vuelve a capturarlos.`;
}
