import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { kairosDb } from '../database/kairos-db';
import { describePurge, DRAFT_TTL_MS, hasPurged, purgeExpiredDrafts } from './expired-drafts';

const NOW = new Date('2026-10-21T12:00:00.000Z');
const H = 60 * 60 * 1000;
const iso = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * H).toISOString();
const blob = new Blob(['x']);

function evidence(over: Record<string, unknown>) {
  return {
    rentalId: 'r-1',
    returnId: null,
    type: 'PHOTO' as const,
    zone: 'FRONTAL',
    mimeType: 'image/jpeg',
    blob,
    status: 'pending' as const,
    createdAt: NOW.getTime() - 80 * H,
    draftCreatedAt: iso(80),
    ...over,
  };
}

beforeEach(async () => {
  await kairosDb.open();
  await Promise.all([kairosDb.evidence_queue.clear(), kairosDb.sync_drafts.clear(), kairosDb.sync_field_edits.clear()]);
});

afterEach(async () => {
  await Promise.all([kairosDb.evidence_queue.clear(), kairosDb.sync_drafts.clear(), kairosDb.sync_field_edits.clear()]);
});

describe('purgeExpiredDrafts (72 h)', () => {
  it('el TTL es de 72 horas', () => {
    expect(DRAFT_TTL_MS).toBe(72 * H);
  });

  it('BORRA el borrador vencido con sus ediciones sin enviar y sus fotos pendientes; conserva lo vigente', async () => {
    await kairosDb.sync_drafts.bulkPut([
      { checklistType: 'ENTREGA', sourceId: 'r-1', draftCreatedAt: iso(80), deviceId: 'd' },
      { checklistType: 'ENTREGA', sourceId: 'r-2', draftCreatedAt: iso(10), deviceId: 'd' },
    ]);
    await kairosDb.sync_field_edits.bulkPut([
      { checklistType: 'ENTREGA', sourceId: 'r-1', key: 'notes', value: 'a', baseRev: 0, editedAt: iso(79) },
      { checklistType: 'ENTREGA', sourceId: 'r-1', key: 'fivDone', value: true, baseRev: 2, editedAt: iso(79), sentAt: iso(78) },
      { checklistType: 'ENTREGA', sourceId: 'r-2', key: 'notes', value: 'b', baseRev: 0, editedAt: iso(9) },
    ]);
    await kairosDb.evidence_queue.bulkAdd([
      evidence({}),
      evidence({ status: 'error' }),
      evidence({ status: 'synced', reportedAt: iso(70) }),
      evidence({ rentalId: 'r-2', createdAt: NOW.getTime() - 10 * H, draftCreatedAt: iso(10) }),
    ]);

    const result = await purgeExpiredDrafts(NOW);

    expect(result).toEqual({ drafts: 1, fieldEdits: 1, evidence: 2 });
    expect(await kairosDb.sync_drafts.toArray()).toHaveLength(1);
    expect((await kairosDb.sync_drafts.toArray())[0].sourceId).toBe('r-2');
    const edits = await kairosDb.sync_field_edits.toArray();
    expect(edits.map((e) => `${e.sourceId}:${e.key}`).sort()).toEqual(['r-1:fivDone', 'r-2:notes']); // la ya enviada conserva su revisión
    const queue = await kairosDb.evidence_queue.toArray();
    expect(queue.map((q) => `${q.rentalId}:${q.status}`).sort()).toEqual(['r-1:synced', 'r-2:pending']);
  });

  it('justo antes de las 72 h NO borra; a las 72 h exactas sí', async () => {
    await kairosDb.sync_drafts.put({ checklistType: 'RECEPCION', sourceId: 'ret-1', draftCreatedAt: iso(71.99), deviceId: 'd' });
    expect(await purgeExpiredDrafts(NOW)).toEqual({ drafts: 0, fieldEdits: 0, evidence: 0 });
    await kairosDb.sync_drafts.put({ checklistType: 'RECEPCION', sourceId: 'ret-1', draftCreatedAt: iso(72), deviceId: 'd' });
    expect((await purgeExpiredDrafts(NOW)).drafts).toBe(1);
  });

  it('sin nada vencido no hace nada y hasPurged es falso; las fotos usan createdAt si no tienen ancla', async () => {
    expect(hasPurged(await purgeExpiredDrafts(NOW))).toBe(false);
    await kairosDb.evidence_queue.add(evidence({ draftCreatedAt: undefined, createdAt: NOW.getTime() - 100 * H, returnId: 'ret-9', rentalId: null }));
    const result = await purgeExpiredDrafts(NOW);
    expect(result.evidence).toBe(1);
    expect(hasPurged(result)).toBe(true);
  });

  it('el aviso describe qué se borró', () => {
    const text = describePurge({ drafts: 2, fieldEdits: 3, evidence: 5 });
    expect(text).toContain('2 borrador(es)');
    expect(text).toContain('72 horas');
    expect(text).toContain('5 foto(s) o video(s) sin subir');
    expect(text).toContain('3 dato(s) sin enviar');
  });
});
