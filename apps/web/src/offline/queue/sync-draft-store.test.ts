import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../database/kairos-db', async () => {
  const { createFakeKairosDb } = await import('../database/fake-kairos-db.test-utils');
  h.db = createFakeKairosDb();
  return { kairosDb: h.db };
});

import { unsealFieldEditRow } from '../crypto/sealed-store';
import type { SyncFieldEditStored } from '../database/kairos-db';
import type { createFakeKairosDb } from '../database/fake-kairos-db.test-utils';
import {
  applyServerFieldRevisions,
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

  describe('applyServerFieldRevisions (1.1.0, DEC-SYNC-10)', () => {
    // El valor local queda cifrado (SDD-00 §17.4): se lee a traves de la capa de descifrado.
    const baseRevOf = async (key: string) => {
      const row = db().sync_field_edits.all().find((r) => r.key === key) as SyncFieldEditStored | undefined;
      return row ? await unsealFieldEditRow(row) : undefined;
    };

    it('tras un sync exitoso, la siguiente edicion del mismo campo usa la revision nueva como baseRev', async () => {
      await saveFieldEdit('ENTREGA', 'a', { key: 'fuel', value: 'HALF' });
      await markFieldEditsSent('ENTREGA', 'a', ['fuel']);
      await applyServerFieldRevisions('ENTREGA', 'a', [{ key: 'fuel', rev: 1, value: 'HALF' }]);
      await saveFieldEdit('ENTREGA', 'a', { key: 'fuel', value: 'FULL' });
      const [edit] = await getUnsentFieldEdits('ENTREGA', 'a');
      expect(edit).toMatchObject({ key: 'fuel', value: 'FULL', baseRev: 1 });
      expect(edit.sentAt).toBeUndefined();
    });

    it('no toca una edicion local sin enviar (no oculta un cambio ajeno que el usuario nunca vio)', async () => {
      await saveFieldEdit('ENTREGA', 'a', { key: 'fuel', value: 'HALF' });
      await applyServerFieldRevisions('ENTREGA', 'a', [{ key: 'fuel', rev: 5, value: 'EMPTY' }]);
      expect(await baseRevOf('fuel')).toMatchObject({ baseRev: 0, value: 'HALF' });
    });

    it('no toca campos con conflicto abierto ni campos que el dispositivo no trackea', async () => {
      await saveFieldEdit('ENTREGA', 'a', { key: 'fuel', value: 'HALF' });
      await markFieldEditsSent('ENTREGA', 'a', ['fuel']);
      await applyServerFieldRevisions(
        'ENTREGA',
        'a',
        [{ key: 'fuel', rev: 2, value: 'EMPTY' }, { key: 'otro', rev: 1, value: 1 }],
        { openConflictKeys: ['fuel'] },
      );
      expect(await baseRevOf('fuel')).toMatchObject({ baseRev: 0, value: 'HALF' });
      expect(await baseRevOf('otro')).toBeUndefined();
    });

    it('conflicto resuelto con el valor del servidor: el espejo local adopta valor y revision', async () => {
      await saveFieldEdit('ENTREGA', 'a', { key: 'fuel', value: 'FULL' });
      await markFieldEditsSent('ENTREGA', 'a', ['fuel']);
      await applyServerFieldRevisions('ENTREGA', 'a', [{ key: 'fuel', rev: 3, value: 'HALF' }]);
      expect(await baseRevOf('fuel')).toMatchObject({ baseRev: 3, value: 'HALF' });
      expect(await getUnsentFieldEdits('ENTREGA', 'a')).toHaveLength(0);
    });

    it('onlyEditedAt: una reedicion hecha durante el POST no se pisa', async () => {
      await saveFieldEdit('ENTREGA', 'a', { key: 'fuel', value: 'HALF' }, new Date('2026-10-19T10:00:00Z'));
      await markFieldEditsSent('ENTREGA', 'a', ['fuel']);
      await saveFieldEdit('ENTREGA', 'a', { key: 'fuel', value: 'FULL' }, new Date('2026-10-19T10:05:00Z'));
      await applyServerFieldRevisions('ENTREGA', 'a', [{ key: 'fuel', rev: 1, value: 'HALF' }], {
        onlyEditedAt: { fuel: '2026-10-19T10:00:00.000Z' },
      });
      expect(await baseRevOf('fuel')).toMatchObject({ baseRev: 0, value: 'FULL' });
    });

    it('sin revisiones (servidor 1.0.0) no hace nada', async () => {
      await saveFieldEdit('ENTREGA', 'a', { key: 'fuel', value: 'HALF' });
      await applyServerFieldRevisions('ENTREGA', 'a', undefined);
      await applyServerFieldRevisions('ENTREGA', 'a', []);
      expect(await baseRevOf('fuel')).toMatchObject({ baseRev: 0 });
    });
  });
});
