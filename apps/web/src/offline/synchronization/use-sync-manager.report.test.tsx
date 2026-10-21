import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const q = vi.hoisted(() => ({ pending: [] as unknown[], unreported: [] as unknown[] }));
vi.mock('../queue/evidence-upload-queue', () => ({
  getPendingEvidence: vi.fn(async () => q.pending),
  getPendingEvidenceForReturn: vi.fn(async () => q.pending),
  markEvidenceSynced: vi.fn(async () => undefined),
  markEvidenceFailed: vi.fn(async () => undefined),
  getUnreportedEvidence: vi.fn(async () => q.unreported),
  markEvidenceReported: vi.fn(async () => undefined),
  ensureEvidenceHash: vi.fn(async (i: { contentHash?: string }) => i.contentHash ?? 'f'.repeat(64)),
}));
const d = vi.hoisted(() => ({ edits: [] as unknown[], draft: undefined as unknown }));
vi.mock('../queue/sync-draft-store', () => ({
  clearSyncedDraft: vi.fn(async () => undefined),
  getSyncDraft: vi.fn(async () => d.draft),
  getUnsentFieldEdits: vi.fn(async () => d.edits),
  markFieldEditsSent: vi.fn(async () => undefined),
}));
vi.mock('../../app/rentals/rentals-documents-client', () => ({
  requestEvidenceUploadSession: vi.fn(async () => ({ uploadUrl: 'u', objectUrl: 'o' })),
  uploadEvidenceToGcs: vi.fn(async () => undefined),
  recordEvidence: vi.fn(async () => ({})),
}));
vi.mock('../../app/returns/returns-evidence-client', () => ({
  requestReturnEvidenceUploadSession: vi.fn(async () => ({ uploadUrl: 'u', objectUrl: 'o' })),
  uploadReturnEvidenceToGcs: vi.fn(async () => undefined),
  recordReturnEvidence: vi.fn(async () => ({})),
}));
const sync = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('../../app/sync/sync-client', async (orig) => ({
  ...(await orig<typeof import('../../app/sync/sync-client')>()),
  syncChecklist: (...a: unknown[]) => sync.fn(...a),
}));

import { SyncCommandError } from '../../app/sync/sync-client';
import { useSyncManager } from './use-sync-manager';
import { clearSyncedDraft, markFieldEditsSent } from '../queue/sync-draft-store';
import { markEvidenceReported } from '../queue/evidence-upload-queue';

const getIdToken = async () => 'tok';
const blob = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
const HASH = 'a'.repeat(64);
const uploaded = (over: Record<string, unknown> = {}) => ({
  id: 5, rentalId: 'r-1', returnId: null, type: 'PHOTO', zone: 'FRONTAL', mimeType: 'image/jpeg', blob, status: 'synced',
  createdAt: Date.UTC(2026, 9, 19, 15, 0, 0), clientCaptureId: '33333333-3333-4333-8333-333333333333', slot: 2,
  contentHash: HASH, baseRev: 0, draftCreatedAt: '2026-10-19T14:00:00.000Z', deviceId: 'dev-1', ...over,
});
const ok = (status: 'SYNCED' | 'SYNC_CONFLICT' = 'SYNCED') => ({
  checklistType: 'ENTREGA', sourceId: 'r-1', status, serverConfirmedAt: status === 'SYNCED' ? '2026-10-19T16:00:00Z' : null,
  stateVersion: 1, openConflicts: [], appliedFields: [], unchangedFields: [], discardedFields: [], addedEvidence: [], duplicateEvidence: [],
});

function run(onServerSync?: (r: unknown) => void, params: Record<string, unknown> = { rentalId: 'r-1' }) {
  const hook = renderHook(() => useSyncManager({ companyId: 'c', branchId: 'b', getIdToken, onServerSync, ...params } as never));
  act(() => hook.result.current.triggerSync());
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  q.pending = [];
  q.unreported = [];
  d.edits = [];
  d.draft = undefined;
  sync.fn.mockResolvedValue(ok());
});

describe('useSyncManager -> POST /sync (sync.yaml)', () => {
  it('envia clientCaptureId, slot, contentHash, draftCreatedAt, deviceId y campos con baseRev', async () => {
    q.unreported = [uploaded()];
    d.edits = [{ key: 'notes', value: 'abc', baseRev: 0, editedAt: '2026-10-19T14:30:00.000Z' }];
    const onServerSync = vi.fn();
    run(onServerSync);
    await waitFor(() => expect(sync.fn).toHaveBeenCalledTimes(1));
    const [token, type, sourceId, body, key] = sync.fn.mock.calls[0];
    expect(token).toBe('tok');
    expect(type).toBe('ENTREGA');
    expect(sourceId).toBe('r-1');
    expect(body).toMatchObject({
      companyId: 'c', branchId: 'b', draftCreatedAt: '2026-10-19T14:00:00.000Z', deviceId: expect.any(String),
      fields: [{ key: 'notes', value: 'abc', baseRev: 0, editedAt: '2026-10-19T14:30:00.000Z' }],
      evidence: [{
        clientCaptureId: '33333333-3333-4333-8333-333333333333', zone: 'FRONTAL', slot: 2, type: 'PHOTO', contentHash: HASH,
        sizeBytes: 1, capturedAt: '2026-10-19T15:00:00.000Z', deviceId: 'dev-1',
      }],
    });
    expect(key).toMatch(/^sync-[0-9a-f]{40}$/);
    await waitFor(() => expect(onServerSync).toHaveBeenCalledWith(expect.objectContaining({ status: 'SYNCED' })));
    expect(markEvidenceReported).toHaveBeenCalledWith([5]);
    expect(markFieldEditsSent).toHaveBeenCalledWith('ENTREGA', 'r-1', ['notes']);
    expect(clearSyncedDraft).toHaveBeenCalledWith('ENTREGA', 'r-1');
  });

  it('DEV-04 usa RECEPCION con el returnId', async () => {
    q.unreported = [uploaded({ rentalId: null, returnId: 'ret-1' })];
    run(undefined, { returnId: 'ret-1' });
    await waitFor(() => expect(sync.fn).toHaveBeenCalled());
    expect(sync.fn.mock.calls[0].slice(1, 3)).toEqual(['RECEPCION', 'ret-1']);
  });

  it('draftCreatedAt usa el ancla del borrador si existe', async () => {
    q.unreported = [uploaded()];
    d.draft = { draftCreatedAt: '2026-10-19T08:00:00.000Z' };
    run();
    await waitFor(() => expect(sync.fn).toHaveBeenCalled());
    expect(sync.fn.mock.calls[0][3].draftCreatedAt).toBe('2026-10-19T08:00:00.000Z');
  });

  it('la misma carga produce la misma Idempotency-Key (reintento no duplica)', async () => {
    q.unreported = [uploaded()];
    run();
    await waitFor(() => expect(sync.fn).toHaveBeenCalledTimes(1));
    run();
    await waitFor(() => expect(sync.fn).toHaveBeenCalledTimes(2));
    expect(sync.fn.mock.calls[1][4]).toBe(sync.fn.mock.calls[0][4]);
  });

  it('SYNC_CONFLICT: informa al servidor, avisa a la pantalla y NO borra el borrador ni resuelve nada', async () => {
    q.unreported = [uploaded()];
    sync.fn.mockResolvedValue(ok('SYNC_CONFLICT'));
    const onServerSync = vi.fn();
    run(onServerSync);
    await waitFor(() => expect(onServerSync).toHaveBeenCalledWith(expect.objectContaining({ status: 'SYNC_CONFLICT' })));
    expect(clearSyncedDraft).not.toHaveBeenCalled();
    expect(markEvidenceReported).toHaveBeenCalled();
  });

  it('error de dominio: mensaje de negocio, reintentable (no se marca reportado)', async () => {
    q.unreported = [uploaded()];
    sync.fn.mockRejectedValue(new SyncCommandError(422, { code: 'SYNC_DRAFT_EXPIRED', detail: 'ttl' }));
    const { result } = run();
    await waitFor(() => expect(result.current.syncError).toMatch(/venció/));
    expect(markEvidenceReported).not.toHaveBeenCalled();
    expect(markFieldEditsSent).not.toHaveBeenCalled();
  });

  it('sin nada que informar no llama a /sync (expediente que no uso el flujo offline)', async () => {
    const { result } = run();
    await waitFor(() => expect(result.current.syncing).toBe(false));
    expect(sync.fn).not.toHaveBeenCalled();
  });

  it('parte las evidencias en lotes de 100 y los campos viajan en el primero', async () => {
    q.unreported = Array.from({ length: 101 }, (_, i) => uploaded({ id: i + 1, clientCaptureId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` }));
    d.edits = [{ key: 'notes', value: 'x', baseRev: 0, editedAt: '2026-10-19T14:30:00.000Z' }];
    run();
    await waitFor(() => expect(sync.fn).toHaveBeenCalledTimes(2));
    expect(sync.fn.mock.calls[0][3].evidence).toHaveLength(100);
    expect(sync.fn.mock.calls[0][3].fields).toHaveLength(1);
    expect(sync.fn.mock.calls[1][3].evidence).toHaveLength(1);
    expect(sync.fn.mock.calls[1][3].fields).toHaveLength(0);
  });
});
