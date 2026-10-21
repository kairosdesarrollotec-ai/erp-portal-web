import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { KAIROS_DB_VERSION, kairosDb } from './kairos-db';

/**
 * Migración REAL Dexie v1 -> v2 (IndexedDB simulada con fake-indexeddb): se crea la base «kairos-erp-v1» tal como la dejó
 * la versión 1 de la app, con fotos en cola, y se abre con el esquema actual. No se debe perder ningún dato.
 */
describe('kairos-db: migración Dexie v1 -> v2 (fake-indexeddb)', () => {
  it('conserva la cola, completa los metadatos de sync y crea las tablas nuevas', async () => {
    const v1 = new Dexie('kairos-erp-v1');
    v1.version(1).stores({ evidence_queue: '++id, rentalId, returnId, status, createdAt' });
    const base = Date.UTC(2026, 9, 19, 15, 0, 0);
    const blob = new Blob(['foto']);
    await v1.table('evidence_queue').bulkAdd([
      { rentalId: 'r-1', returnId: null, type: 'PHOTO', zone: 'FRONTAL', mimeType: 'image/jpeg', blob, status: 'pending', createdAt: base },
      { rentalId: 'r-1', returnId: null, type: 'PHOTO', zone: 'FRONTAL', mimeType: 'image/jpeg', blob, status: 'synced', createdAt: base + 1000 },
      { rentalId: 'r-1', returnId: null, type: 'VIDEO', zone: 'INTERIOR', mimeType: 'video/mp4', blob, status: 'error', errorMsg: 'boom', createdAt: base + 2000 },
      { rentalId: null, returnId: 'ret-1', type: 'PHOTO', zone: 'FRONTAL', mimeType: 'image/webp', blob, status: 'pending', createdAt: base + 3000 },
    ]);
    expect(v1.verno).toBe(1);
    v1.close();

    await kairosDb.open();
    expect(kairosDb.verno).toBe(KAIROS_DB_VERSION);

    const rows = await kairosDb.evidence_queue.orderBy('id').toArray();
    expect(rows).toHaveLength(4);
    // slots secuenciales por expediente+zona, en orden de captura
    expect(rows.map((r) => r.slot)).toEqual([1, 2, 1, 1]);
    // cada captura recibe un clientCaptureId único y metadatos de sync
    expect(new Set(rows.map((r) => r.clientCaptureId)).size).toBe(4);
    expect(rows.every((r) => r.baseRev === 0 && !!r.deviceId && !!r.draftCreatedAt)).toBe(true);
    expect(rows[0].draftCreatedAt).toBe(new Date(base).toISOString());
    // datos previos intactos
    expect(rows[2]).toMatchObject({ status: 'error', errorMsg: 'boom', type: 'VIDEO', zone: 'INTERIOR', mimeType: 'video/mp4' });
    expect(rows[0].blob).toBeDefined(); // (fake-indexeddb no clona Blob de jsdom con fidelidad: solo se verifica que el campo se conserva)
    // lo ya subido en v1 queda como reportado (no se reenvía); lo pendiente no
    expect(rows[1].reportedAt).toBeTruthy();
    expect(rows[0].reportedAt).toBeUndefined();
    // el índice nuevo por clientCaptureId funciona y las tablas nuevas existen vacías
    expect(await kairosDb.evidence_queue.where('clientCaptureId').equals(rows[3].clientCaptureId as string).count()).toBe(1);
    expect(await kairosDb.sync_drafts.count()).toBe(0);
    expect(await kairosDb.sync_field_edits.count()).toBe(0);
    kairosDb.close();
  });
});
