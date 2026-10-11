import Dexie, { type Table } from 'dexie';

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
}

class KairosDatabase extends Dexie {
  evidence_queue!: Table<EvidenceQueueItem, number>;
  constructor() {
    super('kairos-erp-v1');
    this.version(1).stores({
      evidence_queue: '++id, rentalId, returnId, status, createdAt',
    });
  }
}
export const kairosDb = new KairosDatabase();
