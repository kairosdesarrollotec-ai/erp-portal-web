import Dexie, { type Table } from 'dexie';
import { getDeviceId } from './device-id';

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
  // ── v2 (sync.yaml 1.0.0): metadatos que exige POST /sync/checklists/.../commands/sync ──
  /** Idempotencia por captura (UUID generado offline). */
  clientCaptureId?: string;
  /** N.o de toma dentro de la zona (>= 1). */
  slot?: number;
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

export const KAIROS_DB_VERSION = 2;

class KairosDatabase extends Dexie {
  evidence_queue!: Table<EvidenceQueueItem, number>;
  sync_drafts!: Table<SyncDraftRow, [string, string]>;
  sync_field_edits!: Table<SyncFieldEditRow, [string, string, string]>;
  constructor() {
    super('kairos-erp-v1');
    this.version(1).stores({
      evidence_queue: '++id, rentalId, returnId, status, createdAt',
    });
    this.version(KAIROS_DB_VERSION)
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
  }
}
export const kairosDb = new KairosDatabase();
