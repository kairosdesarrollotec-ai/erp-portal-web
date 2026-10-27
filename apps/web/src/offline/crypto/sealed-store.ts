import {
  kairosDb,
  type AttendanceQueueItem,
  type AttendanceQueueRow,
  type EvidenceQueueItem,
  type EvidenceQueueRow,
  type SyncFieldEditRow,
  type SyncFieldEditStored,
} from '../database/kairos-db';
import { decryptLocalBlob, decryptLocalPayload, encryptLocalBlob, encryptLocalPayload } from './local-encryption';
import { getLocalCryptoUserId, requireLocalCryptoUserId } from './local-user';

/**
 * Capa UNICA de cifrado de las filas de IndexedDB (SDD-00 §17.4, `sdd-00-transversal.md` ~632).
 * Todo almacen offline con datos de personas, ubicaciones, fotos o valores de checklist guarda y lee SOLO a traves de
 * estas funciones. Quedan en claro unicamente los metadatos de indexacion/estado (ids, fechas, estado, tipo).
 *
 *  - evidence_queue    -> `blob` (foto/video) cifrado en `blobSealed`.
 *  - attendance_queue  -> ubicacion, estado de la marca, notas y foto cifrados (`sealed`, `photoSealed`).
 *  - sync_field_edits  -> `value` cifrado en `valueSealed`.
 *  - sync_drafts       -> solo ids y fechas (metadatos): se mantiene en claro.
 *  - PAYMENT           -> prohibido offline (`assertOfflineAllowed`).
 */

// ── Evidencia ──────────────────────────────────────────────────────────────

export async function sealEvidenceRow<T extends { blob: Blob }>(
  item: T,
): Promise<Omit<T, 'blob'> & { blobSealed: NonNullable<EvidenceQueueRow['blobSealed']> }> {
  const userId = requireLocalCryptoUserId();
  const { blob, ...rest } = item;
  return { ...rest, blobSealed: await encryptLocalBlob(userId, blob) };
}

export async function unsealEvidenceRow(row: EvidenceQueueRow): Promise<EvidenceQueueItem> {
  if (!row.blobSealed) return row as EvidenceQueueItem; // heredada en texto plano
  const blob = await decryptLocalBlob(requireLocalCryptoUserId(), row.blobSealed);
  const { blobSealed, ...rest } = row;
  void blobSealed;
  return { ...rest, blob } as EvidenceQueueItem;
}

// ── Asistencia ─────────────────────────────────────────────────────────────

interface AttendanceSealedData {
  status?: AttendanceQueueItem['status'];
  minutesLate?: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  notes?: string;
  photoMimeType?: string;
}

export async function sealAttendanceRow(item: AttendanceQueueItem): Promise<AttendanceQueueRow> {
  const userId = requireLocalCryptoUserId();
  const { status, minutesLate, latitude, longitude, accuracy, notes, photoBlob, photoMimeType, ...clear } = item;
  const data: AttendanceSealedData = { status, minutesLate, latitude, longitude, accuracy, notes, photoMimeType };
  const sealed = await encryptLocalPayload(userId, data);
  const photoSealed = photoBlob ? await encryptLocalBlob(userId, photoBlob) : undefined;
  return { ...clear, sealed, ...(photoSealed ? { photoSealed } : {}) };
}

export async function unsealAttendanceRow(row: AttendanceQueueRow): Promise<AttendanceQueueItem> {
  if (!row.sealed) return row as AttendanceQueueItem; // heredada en texto plano
  const userId = requireLocalCryptoUserId();
  const data = await decryptLocalPayload<AttendanceSealedData>(userId, row.sealed);
  const photoBlob = row.photoSealed ? await decryptLocalBlob(userId, row.photoSealed) : null;
  const { sealed, photoSealed, ...clear } = row;
  void sealed;
  void photoSealed;
  return { ...clear, ...data, photoBlob } as AttendanceQueueItem;
}

// ── Ediciones de campos del checklist ──────────────────────────────────────

export async function sealFieldEditRow(edit: SyncFieldEditRow): Promise<SyncFieldEditStored> {
  const userId = requireLocalCryptoUserId();
  const { value, ...rest } = edit;
  return { ...rest, valueSealed: await encryptLocalPayload(userId, { value }, edit.dataType) };
}

export async function unsealFieldEditRow(row: SyncFieldEditStored): Promise<SyncFieldEditRow> {
  if (!row.valueSealed) return { ...row, value: row.value ?? null };
  const { value } = await decryptLocalPayload<{ value: SyncFieldEditRow['value'] }>(
    requireLocalCryptoUserId(),
    row.valueSealed,
  );
  const { valueSealed, ...rest } = row;
  void valueSealed;
  return { ...rest, value };
}

/**
 * Descifra una lista de filas. Una fila que no se puede leer (clave ausente, dato corrupto, sin sesion) se OMITE y se
 * registra en consola: nunca se expone un dato ilegible ni se rompe la pantalla.
 */
export async function unsealMany<R, T>(rows: readonly R[], unseal: (row: R) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  for (const row of rows) {
    try {
      out.push(await unseal(row));
    } catch (error) {
      console.warn('[offline] Fila local ilegible; se omite.', error instanceof Error ? error.message : error);
    }
  }
  return out;
}

// ── Migracion de datos heredados y purga ───────────────────────────────────

export interface SealLegacyResult {
  evidence: number;
  fieldEdits: number;
  attendance: number;
}

/**
 * Cifra de forma perezosa lo que haya en texto plano (filas anteriores al cifrado). Se ejecuta al iniciar sesion; la
 * transaccion de upgrade de Dexie no admite esperar `crypto`, por eso no se hace en la migracion de esquema. Sin
 * sesion no hace nada. Cada fila se REEMPLAZA (`put` con el mismo id): el texto plano deja de existir.
 */
export async function sealLegacyLocalData(): Promise<SealLegacyResult> {
  const result: SealLegacyResult = { evidence: 0, fieldEdits: 0, attendance: 0 };
  if (!getLocalCryptoUserId()) return result;
  await kairosDb.open();

  const legacyEvidence = await kairosDb.evidence_queue.filter((r) => !r.blobSealed && !!r.blob).toArray();
  for (const row of legacyEvidence) {
    const sealed = await sealEvidenceRow(row as EvidenceQueueItem);
    await kairosDb.evidence_queue.put({ ...sealed, id: row.id } as EvidenceQueueRow);
    result.evidence += 1;
  }

  const legacyEdits = await kairosDb.sync_field_edits.filter((r) => !r.valueSealed).toArray();
  for (const row of legacyEdits) {
    const sealed = await sealFieldEditRow({ ...row, value: row.value ?? null });
    await kairosDb.sync_field_edits.put(sealed);
    result.fieldEdits += 1;
  }

  const legacyAttendance = await kairosDb.attendance_queue
    .filter((r) => !r.sealed && typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .toArray();
  for (const row of legacyAttendance) {
    const sealed = await sealAttendanceRow(row as AttendanceQueueItem);
    await kairosDb.attendance_queue.put({ ...sealed, id: row.id });
    result.attendance += 1;
  }

  return result;
}

/**
 * Cierre de sesion / revocacion / incidente (SDD-00 §17.4): borra todo lo guardado sin conexion en este dispositivo.
 * La clave se descarta aparte (`discardUserCryptoKeys`). Quien llama debe haber avisado antes si hay datos sin sincronizar.
 */
export async function purgeLocalSensitiveData(): Promise<void> {
  await kairosDb.open();
  await Promise.all([
    kairosDb.evidence_queue.clear(),
    kairosDb.sync_field_edits.clear(),
    kairosDb.attendance_queue.clear(),
    kairosDb.sync_drafts.clear(),
  ]);
}
