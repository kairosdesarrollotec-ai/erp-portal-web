import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../database/kairos-db', async () => {
  const { createFakeKairosDb } = await import('../database/fake-kairos-db.test-utils');
  h.db = createFakeKairosDb();
  return { kairosDb: h.db };
});

import type { createFakeKairosDb } from '../database/fake-kairos-db.test-utils';
import {
  clearSyncedDraft,
  ensureSyncDraft,
  getSyncDraft,
  getUnsentFieldEdits,
  markFieldEditsSent,
  saveFieldEdit,
} from './sync-draft-store';

const db = () => h.db as ReturnType<typeof createFakeKairosDb>;

beforeEach(() => Object.values(db()).forEach((t) => t.clear()));

describe('sync-draft-store', () => {
  it('ensureSyncDraft crea el ancla una sola vez (TTL 72 h parte de la primera captura)', async () => {
    const first = await ensureSyncDraft('ENTREGA', 'r-1', new Date('2026-10-19T10:00:00Z'));
    const again = await ensureSyncDraft('ENTREGA', 'r-1', new Date('2026-10-19T20:00:00Z'));
    expect(first.draftCreatedAt).toBe('2026-10-19T10:00:00.000Z');
    expect(again.draftCreatedAt).toBe(first.draftCreatedAt);
    expect(first.deviceId).toBeTruthy();
  });

  it('saveFieldEdit guarda valor, baseRev 0 y editedAt; una segunda edicion conserva el baseRev', async () => {
    await saveFieldEdit('RECEPCION', 'ret-1', { key: 'notes', value: 'uno' }, new Date('2026-10-19T10:00:00Z'));
    await saveFieldEdit('RECEPCION', 'ret-1', { key: 'notes', value: 'dos' }, new Date('2026-10-19T11:00:00Z'));
    const rows = await getUnsentFieldEdits('RECEPCION', 'ret-1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'notes', value: 'dos', baseRev: 0, editedAt: '2026-10-19T11:00:00.000Z' });
    expect(await getSyncDraft('RECEPCION', 'ret-1')).toBeTruthy();
  });

  it('aisla expedientes y tipos; markFieldEditsSent los saca de los pendientes', async () => {
    await saveFieldEdit('ENTREGA', 'a', { key: 'k1', value: 1 });
    await saveFieldEdit('ENTREGA', 'a', { key: 'k2', value: true });
    await saveFieldEdit('ENTREGA', 'b', { key: 'k1', value: 2 });
    expect(await getUnsentFieldEdits('ENTREGA', 'a')).toHaveLength(2);
    await markFieldEditsSent('ENTREGA', 'a', ['k1']);
    expect((await getUnsentFieldEdits('ENTREGA', 'a')).map((r) => r.key)).toEqual(['k2']);
    expect(await getUnsentFieldEdits('ENTREGA', 'b')).toHaveLength(1);
    expect(await getUnsentFieldEdits('RECEPCION', 'a')).toHaveLength(0);
  });

  it('clearSyncedDraft borra solo el ancla; las ediciones y su baseRev se conservan', async () => {
    await saveFieldEdit('ENTREGA', 'a', { key: 'k1', value: 1 });
    await clearSyncedDraft('ENTREGA', 'a');
    expect(await getSyncDraft('ENTREGA', 'a')).toBeUndefined();
    expect(await getUnsentFieldEdits('ENTREGA', 'a')).toHaveLength(1);
  });
});
