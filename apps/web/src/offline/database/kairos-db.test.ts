import { describe, expect, it } from 'vitest';
import { KAIROS_DB_VERSION, backfillEvidenceItemV2, kairosDb, type EvidenceQueueItem } from './kairos-db';

const blob = new Blob(['x']);
const item = (over: Partial<EvidenceQueueItem>): EvidenceQueueItem => ({
  rentalId: 'r-1',
  returnId: null,
  type: 'PHOTO',
  zone: 'FRONTAL',
  mimeType: 'image/jpeg',
  blob,
  status: 'pending',
  createdAt: Date.UTC(2026, 9, 19, 15, 0, 0),
  ...over,
});

describe('kairos-db v2', () => {
  it('declara la version 2 con indices de sync y las tablas nuevas, conservando la v1', () => {
    expect(KAIROS_DB_VERSION).toBe(2);
    expect(kairosDb.verno).toBe(2);
    const queue = kairosDb.table('evidence_queue').schema;
    const indexes = queue.indexes.map((i) => i.name);
    expect(queue.primKey.name).toBe('id');
    expect(queue.primKey.auto).toBe(true);
    expect(indexes).toEqual(expect.arrayContaining(['rentalId', 'returnId', 'status', 'createdAt', 'clientCaptureId', 'contentHash']));
    expect(kairosDb.tables.map((t) => t.name).sort()).toEqual(['evidence_queue', 'sync_drafts', 'sync_field_edits']);
    expect(kairosDb.table('sync_drafts').schema.primKey.keyPath).toEqual(['checklistType', 'sourceId']);
    expect(kairosDb.table('sync_field_edits').schema.primKey.keyPath).toEqual(['checklistType', 'sourceId', 'key']);
  });

  it('la migracion asigna clientCaptureId, slot secuencial por expediente+zona, baseRev, draftCreatedAt y deviceId', () => {
    const counters = new Map<string, number>();
    let n = 0;
    const newId = () => `id-${++n}`;
    const a = item({});
    const b = item({});
    const c = item({ zone: 'INTERIOR' });
    const d = item({ rentalId: null, returnId: 'ret-1' });
    [a, b, c, d].forEach((x) => backfillEvidenceItemV2(x, counters, 'dev-X', newId));
    expect([a.slot, b.slot, c.slot, d.slot]).toEqual([1, 2, 1, 1]);
    expect(a.clientCaptureId).toBe('id-1');
    expect(new Set([a, b, c, d].map((x) => x.clientCaptureId)).size).toBe(4);
    expect(a.baseRev).toBe(0);
    expect(a.draftCreatedAt).toBe('2026-10-19T15:00:00.000Z');
    expect(a.deviceId).toBe('dev-X');
    expect(a.contentHash).toBeUndefined(); // se calcula al sincronizar
  });

  it('la migracion NO pierde datos: conserva blob, estado y campos previos, y no pisa metadatos ya presentes', () => {
    const counters = new Map<string, number>();
    const original = item({ status: 'error', errorMsg: 'boom', clientCaptureId: 'ya-tengo', slot: 7 });
    backfillEvidenceItemV2(original, counters, 'dev', () => 'nuevo');
    expect(original).toMatchObject({ status: 'error', errorMsg: 'boom', clientCaptureId: 'ya-tengo', slot: 7, zone: 'FRONTAL', type: 'PHOTO' });
    expect(original.blob).toBe(blob);
  });

  it('items ya subidos en v1 quedan como reportados (no se reenvian al servidor)', () => {
    const synced = item({ status: 'synced' });
    const pending = item({ status: 'pending' });
    backfillEvidenceItemV2(synced, new Map(), 'dev', () => 'x');
    backfillEvidenceItemV2(pending, new Map(), 'dev', () => 'y');
    expect(synced.reportedAt).toBeTruthy();
    expect(pending.reportedAt).toBeUndefined();
  });
});
