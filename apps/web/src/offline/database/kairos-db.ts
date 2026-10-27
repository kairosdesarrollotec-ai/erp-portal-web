import Dexie, { type Table } from 'dexie';
import { getDeviceId } from './device-id';
import type { EncryptedBlobPayload, EncryptedRecordPayload } from '../crypto/local-encryption';

export interface EvidenceQueueItem {
  id?: number;
  rentalId: string | null;
  returnId: string | null;
  type: 'PHOTO' | 'VIDEO';
  zone: string;
  mimeType: string;
  blob: Blob;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  errorMsg?: string;
  createdAt: number;
  // ── v2 (sync.yaml 1.0.0+): metadatos que exige POST /sync/checklists/.../commands/sync ──
  /** Idempotencia por captura (UUID generado offline). */
  clientCaptureId?: string;
  /**
   * N.o de toma LOCAL dentro de la zona (>= 1): solo ordena/muestra en el dispositivo. Desde sync.yaml 1.1.0 NO se envia
   * al servidor (DEC-SYNC-11): el servidor asigna el slot y el dispositivo lo guarda en `serverSlot`.
   */
  slot?: number;
  /** Slot definitivo que asigno (o ya tenia) el servidor para esta toma (respuesta `evidenceSlots`). */
  serverSlot?: number;
  /** SHA-256 hexadecimal del archivo; si falta al encolar se calcula antes de sincronizar. */
  contentHash?: string;
  /** Revision base que el dispositivo vio por ultima vez (0 = nunca sincronizado). */
  baseRev?: number;
  /** Creacion del borrador en el dispositivo (ISO UTC; TTL 72 h del servidor). */
  draftCreatedAt?: string;
  deviceId?: string;
  /** ISO UTC en que el servidor recibio los metadatos via /sync (evita reenviar y duplicar). */
  reportedAt?: string;
}

export type SyncChecklistKind = 'ENTREGA' | 'RECEPCION';

/** Borrador offline de un expediente: ancla el TTL de 72 h (`draftCreatedAt`). */
export interface SyncDraftRow {
  checklistType: SyncChecklistKind;
  sourceId: string;
  draftCreatedAt: string;
  deviceId: string;
}

/** Edicion offline de un campo del checklist, con la revision base que vio el dispositivo. */
export interface SyncFieldEditRow {
  checklistType: SyncChecklistKind;
  sourceId: string;
  key: string;
  dataType?: 'CHECKLIST' | 'AVAILABILITY' | 'RESERVATION' | 'VEHICLE_STATE' | 'PAYMENT' | 'EMPLOYEE' | 'CRITICAL_DELETE';
  value: string | number | boolean | null;
  baseRev: number;
  editedAt: string;
  /** ISO UTC en que se envio al servidor. */
  sentAt?: string;
}

/**
 * SDD-00 §17.4: filas tal como se guardan en IndexedDB. Los datos sensibles (fotos/videos, ubicacion, valores de campos)
 * van cifrados con AES-256-GCM (`*Sealed` / `sealed`); solo quedan en claro los metadatos de indexacion y de estado.
 * Las filas heredadas en texto plano (sin `*Sealed`) siguen siendo legibles y se cifran al iniciar sesion
 * (`sealLegacyLocalData`). Los modulos de cola exponen siempre los tipos de dominio (`EvidenceQueueItem`, etc.).
 */
export type EvidenceQueueRow = Omit<EvidenceQueueItem, 'blob'> & { blob?: Blob; blobSealed?: EncryptedBlobPayload };
export type SyncFieldEditStored = Omit<SyncFieldEditRow, 'value'> & {
  value?: SyncFieldEditRow['value'];
  valueSealed?: EncryptedRecordPayload;
};

/** Contadores de slot por expediente+zona usados al migrar (puro, testeable). */
export type SlotCounters = Map<string, number>;

/**
 * Migracion v1 -> v2 de un item de la cola: asigna clientCaptureId, slot (secuencial por expediente+zona, en orden
 * de captura), baseRev 0, draftCreatedAt = createdAt y deviceId. `contentHash` NO se calcula aqui (las transacciones
 * de upgrade de IndexedDB no admiten esperar crypto): se completa al sincronizar. Los items que ya estaban
 * `synced` en v1 se marcan como reportados para no reenviarlos ni duplicarlos: no se pierde ningun dato.
 */
export function backfillEvidenceItemV2(
  item: EvidenceQueueItem,
  counters: SlotCounters,
  deviceId: string,
  newId: () => string,
): void {
  const scope = `${item.rentalId ?? ''}|${item.returnId ?? ''}|${item.zone}`;
  const slot = (counters.get(scope) ?? 0) + 1;
  counters.set(scope, slot);
  item.clientCaptureId ??= newId();
  item.slot ??= slot;
  item.baseRev ??= 0;
  item.draftCreatedAt ??= new Date(item.createdAt).toISOString();
  item.deviceId ??= deviceId;
  if (item.status === 'synced') item.reportedAt ??= item.draftCreatedAt;
}

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

export type AttendanceQueueStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'expired';

export interface AttendanceQueueItem {
  id?: number;
  employeeId: string;
  companyId: string;
  branchId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  status?: 'PRESENTE' | 'TARDANZA';
  minutesLate?: number;
  date: string; // YYYY-MM-DD en America/Lima
  capturedAt: string; // ISO de captura en dispositivo
  latitude: number;
  longitude: number;
  accuracy: number;
  notes?: string;
  photoBlob?: Blob | null;
  photoMimeType?: string;
  queueStatus: AttendanceQueueStatus;
  errorMessage?: string | null;
  createdAt: number;
  syncedAt?: string | null;
}

/** Campos de la marca de asistencia que se cifran (ubicacion, foto y datos de la marca). */
export type AttendanceSensitiveKeys =
  | 'status'
  | 'minutesLate'
  | 'latitude'
  | 'longitude'
  | 'accuracy'
  | 'notes'
  | 'photoBlob'
  | 'photoMimeType';
export type AttendanceQueueRow = Omit<AttendanceQueueItem, AttendanceSensitiveKeys> &
  Partial<Pick<AttendanceQueueItem, AttendanceSensitiveKeys>> & {
    sealed?: EncryptedRecordPayload;
    photoSealed?: EncryptedBlobPayload;
  };

export const KAIROS_DB_VERSION = 3;

class KairosDatabase extends Dexie {
  evidence_queue!: Table<EvidenceQueueRow, number>;
  sync_drafts!: Table<SyncDraftRow, [string, string]>;
  sync_field_edits!: Table<SyncFieldEditStored, [string, string, string]>;
  attendance_queue!: Table<AttendanceQueueRow, number>;

  constructor() {
    super('kairos-erp-v1');
    this.version(1).stores({
      evidence_queue: '++id, rentalId, returnId, status, createdAt',
    });
    this.version(2)
      .stores({
        evidence_queue: '++id, rentalId, returnId, status, createdAt, clientCaptureId, contentHash',
        sync_drafts: '[checklistType+sourceId]',
        sync_field_edits: '[checklistType+sourceId+key], [checklistType+sourceId]',
      })
      .upgrade(async (tx) => {
        const counters: SlotCounters = new Map();
        const deviceId = getDeviceId();
        await tx
          .table<EvidenceQueueItem, number>('evidence_queue')
          .orderBy('id')
          .modify((item) => backfillEvidenceItemV2(item, counters, deviceId, randomId));
      });
    this.version(KAIROS_DB_VERSION).stores({
      attendance_queue: '++id, employeeId, date, queueStatus, createdAt, [employeeId+date]',
    });
  }
}
export const kairosDb = new KairosDatabase();
