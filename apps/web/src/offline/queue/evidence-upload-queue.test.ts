import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../database/kairos-db', async () => {
  const { createFakeKairosDb } = await import('../database/fake-kairos-db.test-utils');
  h.db = createFakeKairosDb();
  return { kairosDb: h.db };
});

import type { createFakeKairosDb } from '../database/fake-kairos-db.test-utils';
import { resetDeviceIdForTests } from '../database/device-id';
import {
  addEvidenceToQueue,
  ensureEvidenceHash,
  getPendingEvidence,
  getUnreportedEvidence,
  markEvidenceReported,
  markEvidenceSynced,
} from './evidence-upload-queue';
import { SHA256_HEX } from '../synchronization/content-hash';

const db = () => h.db as ReturnType<typeof createFakeKairosDb>;
const file = (text: string) => new File([text], 'a.jpg', { type: 'image/jpeg' });
const base = { type: 'PHOTO' as const, mimeType: 'image/jpeg' };

beforeEach(() => {
  Object.values(db()).forEach((t) => t.clear());
  localStorage.clear();
  resetDeviceIdForTests();
});

describe('evidence-upload-queue (sync.yaml)', () => {
  it('addEvidenceToQueue guarda clientCaptureId, slot, contentHash SHA-256, baseRev, draftCreatedAt y deviceId', async () => {
    const id = await addEvidenceToQueue({ ...base, rentalId: 'r-1', returnId: null, zone: 'FRONTAL', blob: file('foto-1') });
    const saved = (await db().evidence_queue.get(id)) as Record<string, unknown>;
    expect(saved.status).toBe('pending');
    expect(saved.clientCaptureId).toEqual(expect.any(String));
    expect(saved.slot).toBe(1);
    expect(saved.contentHash).toMatch(SHA256_HEX);
    expect(saved.baseRev).toBe(0);
    expect(new Date(saved.draftCreatedAt as string).toISOString()).toBe(saved.draftCreatedAt);
    expect(saved.deviceId).toEqual(expect.any(String));
    expect(await db().sync_drafts.get(['ENTREGA', 'r-1'])).toBeTruthy();
  });

  it('slot avanza por zona dentro del expediente y reinicia en otra zona/expediente', async () => {
    const add = (rentalId: string | null, returnId: string | null, zone: string) =>
      addEvidenceToQueue({ ...base, rentalId, returnId, zone, blob: file(zone + Math.random()) }).then(
        async (id) => ((await db().evidence_queue.get(id)) as { slot: number }).slot,
      );
    expect(await add('r-1', null, 'FRONTAL')).toBe(1);
    expect(await add('r-1', null, 'FRONTAL')).toBe(2);
    expect(await add('r-1', null, 'INTERIOR')).toBe(1);
    expect(await add('r-2', null, 'FRONTAL')).toBe(1);
    expect(await add(null, 'ret-1', 'FRONTAL')).toBe(1);
  });

  it('clientCaptureId es unico por captura y el mismo archivo da el mismo contentHash', async () => {
    const a = await addEvidenceToQueue({ ...base, rentalId: 'r-1', returnId: null, zone: 'FRONTAL', blob: file('igual') });
    const b = await addEvidenceToQueue({ ...base, rentalId: 'r-1', returnId: null, zone: 'FRONTAL', blob: file('igual') });
    const [ra, rb] = (await Promise.all([db().evidence_queue.get(a), db().evidence_queue.get(b)])) as Array<Record<string, unknown>>;
    expect(ra.clientCaptureId).not.toBe(rb.clientCaptureId);
    expect(ra.contentHash).toBe(rb.contentHash);
  });

  it('deviceId es estable entre capturas', async () => {
    const a = await addEvidenceToQueue({ ...base, rentalId: 'r-1', returnId: null, zone: 'A', blob: file('1') });
    const b = await addEvidenceToQueue({ ...base, rentalId: 'r-9', returnId: null, zone: 'A', blob: file('2') });
    const [ra, rb] = (await Promise.all([db().evidence_queue.get(a), db().evidence_queue.get(b)])) as Array<Record<string, unknown>>;
    expect(ra.deviceId).toBe(rb.deviceId);
  });

  it('conserva el comportamiento previo: pendientes, synced y status', async () => {
    const id = await addEvidenceToQueue({ ...base, rentalId: 'r-1', returnId: null, zone: 'A', blob: file('x') });
    expect(await getPendingEvidence('r-1')).toHaveLength(1);
    await markEvidenceSynced(id);
    expect(await getPendingEvidence('r-1')).toHaveLength(0);
  });

  it('getUnreportedEvidence devuelve solo lo subido y no informado; markEvidenceReported lo excluye', async () => {
    const id = await addEvidenceToQueue({ ...base, rentalId: 'r-1', returnId: null, zone: 'A', blob: file('x') });
    expect(await getUnreportedEvidence({ rentalId: 'r-1' })).toHaveLength(0); // aun pending
    await markEvidenceSynced(id);
    expect(await getUnreportedEvidence({ rentalId: 'r-1' })).toHaveLength(1);
    await markEvidenceReported([id]);
    expect(await getUnreportedEvidence({ rentalId: 'r-1' })).toHaveLength(0);
    expect(await getUnreportedEvidence({})).toEqual([]);
  });

  it('ensureEvidenceHash calcula y persiste el hash faltante (items migrados de v1)', async () => {
    const id = await db().evidence_queue.add({ rentalId: 'r-1', returnId: null, zone: 'A', type: 'PHOTO', mimeType: 'image/jpeg', blob: file('legacy'), status: 'pending', createdAt: 1 });
    const row = (await db().evidence_queue.get(id)) as never;
    const hash = await ensureEvidenceHash(row);
    expect(hash).toMatch(SHA256_HEX);
    expect(((await db().evidence_queue.get(id)) as { contentHash: string }).contentHash).toBe(hash);
  });
});
