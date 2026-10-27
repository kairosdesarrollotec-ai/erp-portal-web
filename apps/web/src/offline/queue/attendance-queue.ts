import {
  kairosDb,
  type AttendanceQueueItem,
  type AttendanceQueueStatus,
} from '../database/kairos-db';
import type { LogMyAttendanceInput } from '../../app/hr-administration/hr-field-trips-client';
import { sealAttendanceRow, unsealAttendanceRow, unsealMany } from '../crypto/sealed-store';

export type { AttendanceQueueItem, AttendanceQueueStatus };

/** Tope máximo de antigüedad para sincronizar marcas de asistencia offline: 24 horas. */
export const MAX_ATTENDANCE_CAPTURE_AGE_MS = 24 * 60 * 60 * 1000;

export interface EnqueueAttendanceInput {
  employeeId: string;
  companyId: string;
  branchId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  status?: 'PRESENTE' | 'TARDANZA';
  minutesLate?: number;
  date: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  notes?: string;
  photoBlob?: Blob | null;
  photoMimeType?: string;
}

export interface SyncAttendanceDeps {
  idToken: string;
  uploadEvidence: (idToken: string, employeeId: string, file: File) => Promise<{ storageRef: string }>;
  logAttendance: (
    idToken: string,
    scope: { companyId: string; branchId: string },
    payload: LogMyAttendanceInput,
  ) => Promise<unknown>;
  now?: () => Date;
}

/**
 * Encola una marca de asistencia en la base de datos Dexie local.
 * Bloquea la creación si ya existe una marca previa para el mismo colaborador y fecha.
 */
export async function enqueueAttendance(input: EnqueueAttendanceInput): Promise<AttendanceQueueItem> {
  const existing = await kairosDb.attendance_queue
    .where('[employeeId+date]')
    .equals([input.employeeId, input.date])
    .toArray();

  const activeExisting = existing.find(
    (item) => item.queueStatus === 'pending' || item.queueStatus === 'syncing' || item.queueStatus === 'synced',
  );

  if (activeExisting) {
    throw new Error('Ya existe una marca registrada o en cola para hoy.');
  }

  const queueItem: AttendanceQueueItem = {
    ...input,
    queueStatus: 'pending',
    errorMessage: null,
    createdAt: Date.now(),
  };

  // SDD-00 §17.4: ubicacion, foto y datos de la marca se guardan cifrados (solo metadatos de estado en claro).
  const id = await kairosDb.attendance_queue.add(await sealAttendanceRow(queueItem));
  return { ...queueItem, id };
}

export async function getAttendanceQueue(employeeId?: string): Promise<AttendanceQueueItem[]> {
  const rows = employeeId
    ? await kairosDb.attendance_queue.where('employeeId').equals(employeeId).toArray()
    : await kairosDb.attendance_queue.toArray();
  return unsealMany(rows, unsealAttendanceRow);
}

export async function getTodayQueuedAttendance(
  employeeId: string,
  date: string,
): Promise<AttendanceQueueItem | undefined> {
  const rows = await kairosDb.attendance_queue
    .where('[employeeId+date]')
    .equals([employeeId, date])
    .toArray();
  const items = await unsealMany(rows, unsealAttendanceRow);

  return items[items.length - 1];
}

/**
 * Sincroniza un ítem individual de la cola de asistencia.
 * - Descarte si vence el tope de 24 h.
 * - No duplica si ya está en curso (syncing) o ya sincronizado (synced).
 * - Sube la foto primero a la URL firmada y luego envía la marca al backend.
 * - Registra error con motivo si falla.
 */
export async function syncSingleAttendanceItem(
  item: AttendanceQueueItem,
  deps: SyncAttendanceDeps,
): Promise<AttendanceQueueItem> {
  if (item.queueStatus === 'synced') {
    return item;
  }

  const now = deps.now ? deps.now() : new Date();
  const captureAge = now.getTime() - new Date(item.capturedAt).getTime();

  if (captureAge > MAX_ATTENDANCE_CAPTURE_AGE_MS) {
    const expiredItem: AttendanceQueueItem = {
      ...item,
      queueStatus: 'expired',
      errorMessage: 'La marca superó el límite de 24 horas y fue descartada.',
    };
    if (item.id !== undefined) {
      await kairosDb.attendance_queue.update(item.id, {
        queueStatus: 'expired',
        errorMessage: expiredItem.errorMessage,
      });
    }
    return expiredItem;
  }

  if (item.queueStatus === 'syncing') {
    return item;
  }

  if (item.id !== undefined) {
    await kairosDb.attendance_queue.update(item.id, {
      queueStatus: 'syncing',
      errorMessage: null,
    });
  }

  try {
    let evidence: { kind: 'SELF_PHOTO'; storageRef: string } | undefined;
    if (item.type === 'CHECK_IN' && item.photoBlob) {
      const file = new File([item.photoBlob], 'attendance_photo.jpg', {
        type: item.photoMimeType || 'image/jpeg',
      });
      const uploadRes = await deps.uploadEvidence(deps.idToken, item.employeeId, file);
      evidence = { kind: 'SELF_PHOTO', storageRef: uploadRes.storageRef };
    }

    const payload = {
      type: item.type,
      ...(item.type === 'CHECK_IN'
        ? {
            status: item.status ?? 'PRESENTE',
            ...(item.status === 'TARDANZA' && item.minutesLate ? { minutesLate: item.minutesLate } : {}),
          }
        : {}),
      capturedAt: item.capturedAt,
      latitude: item.latitude,
      longitude: item.longitude,
      accuracy: item.accuracy,
      ...(item.notes ? { notes: item.notes } : {}),
      ...(evidence ? { evidence } : {}),
    };

    await deps.logAttendance(deps.idToken, { companyId: item.companyId, branchId: item.branchId }, payload);

    const syncedItem: AttendanceQueueItem = {
      ...item,
      queueStatus: 'synced',
      syncedAt: now.toISOString(),
      errorMessage: null,
    };

    if (item.id !== undefined) {
      await kairosDb.attendance_queue.update(item.id, {
        queueStatus: 'synced',
        syncedAt: syncedItem.syncedAt,
        errorMessage: null,
      });
    }

    return syncedItem;
  } catch (err: unknown) {
    const failure = err as { message?: string; detail?: unknown } | null;
    const errorMsg =
      failure?.message || (typeof failure?.detail === 'string' ? failure.detail : 'Error al sincronizar marca');
    const erroredItem: AttendanceQueueItem = {
      ...item,
      queueStatus: 'error',
      errorMessage: errorMsg,
    };

    if (item.id !== undefined) {
      await kairosDb.attendance_queue.update(item.id, {
        queueStatus: 'error',
        errorMessage: errorMsg,
      });
    }

    return erroredItem;
  }
}

export async function syncAttendanceQueue(
  deps: SyncAttendanceDeps & { employeeId?: string },
): Promise<{ syncedCount: number; errorCount: number; expiredCount: number }> {
  let items = await unsealMany(await kairosDb.attendance_queue.toArray(), unsealAttendanceRow);
  if (deps.employeeId) {
    items = items.filter((i) => i.employeeId === deps.employeeId);
  }

  // Filtrar pendientes o errores a reintentar
  const pending = items.filter((i) => i.queueStatus === 'pending' || i.queueStatus === 'error');

  let syncedCount = 0;
  let errorCount = 0;
  let expiredCount = 0;

  for (const item of pending) {
    const res = await syncSingleAttendanceItem(item, deps);
    if (res.queueStatus === 'synced') syncedCount++;
    else if (res.queueStatus === 'expired') expiredCount++;
    else if (res.queueStatus === 'error') errorCount++;
  }

  return { syncedCount, errorCount, expiredCount };
}
