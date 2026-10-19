import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SyncCommandError,
  getChecklistSyncStatus,
  listSyncConflicts,
  resolveSyncConflict,
  syncChecklist,
} from './sync-client';
import { describeSyncError, isSyncVersionMismatch, shouldReloadSyncConflicts } from './sync-errors';
import { makeConflict, syncedStatus } from './sync-test-utils';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

const SRC = '22222222-2222-4222-8222-222222222222';
const body = {
  companyId: 'c1',
  branchId: 'b1',
  deviceId: 'dev-1',
  draftCreatedAt: '2026-10-19T14:00:00Z',
  fields: [{ key: 'notes', value: 'x', baseRev: 0, editedAt: '2026-10-19T14:01:00Z' }],
  evidence: [],
};

describe('sync-client', () => {
  it('syncChecklist: POST con Idempotency-Key y Bearer', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ...syncedStatus('ENTREGA', SRC), appliedFields: [], unchangedFields: [], discardedFields: [], addedEvidence: [], duplicateEvidence: [] }));
    const result = await syncChecklist('tok', 'ENTREGA', SRC, body, 'key-1');
    expect(result.status).toBe('SYNCED');
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.method).toBe('POST');
    expect(req.url).toContain(`/sync/checklists/ENTREGA/${SRC}/commands/sync`);
    expect(req.headers.get('Idempotency-Key')).toBe('key-1');
    expect(req.headers.get('Authorization')).toBe('Bearer tok');
    expect(await req.json()).toMatchObject({ companyId: 'c1', fields: [{ key: 'notes', baseRev: 0 }] });
  });

  it('syncChecklist genera Idempotency-Key si no se pasa', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, syncedStatus('RECEPCION', SRC)));
    await syncChecklist('tok', 'RECEPCION', SRC, body);
    expect((fetchMock.mock.calls[0][0] as Request).headers.get('Idempotency-Key')).toBeTruthy();
  });

  it('getChecklistSyncStatus: GET con companyId y branchId', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, syncedStatus('RECEPCION', SRC)));
    const status = await getChecklistSyncStatus('tok', 'RECEPCION', SRC, 'c1', 'b1');
    expect(status.status).toBe('SYNCED');
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toContain(`/sync/checklists/RECEPCION/${SRC}?companyId=c1&branchId=b1`);
  });

  it('listSyncConflicts: GET /sync/conflicts con filtros', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [makeConflict()]));
    const list = await listSyncConflicts('tok', { companyId: 'c1', branchId: 'b1', checklistType: 'ENTREGA', sourceId: SRC });
    expect(list).toHaveLength(1);
    const url = (fetchMock.mock.calls[0][0] as Request).url;
    expect(url).toContain('/sync/conflicts?');
    expect(url).toContain('checklistType=ENTREGA');
    expect(url).toContain(`sourceId=${SRC}`);
  });

  it('resolveSyncConflict: If-Match con la etag del conflicto, confirmed y reason', async () => {
    const conflict = makeConflict({ etag: '"3"' });
    fetchMock.mockResolvedValue(jsonResponse(200, { conflict, checklistStatus: 'SYNCED', serverConfirmedAt: '2026-10-19T16:00:00Z', openConflicts: 0 }));
    const r = await resolveSyncConflict('tok', conflict, { companyId: 'c1', branchId: 'b1', resolution: 'KEEP_SERVER', reason: 'Prevalece el servidor', confirmed: true }, 'idem-9');
    expect(r.openConflicts).toBe(0);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toContain(`/sync/conflicts/${conflict.id}/commands/resolve`);
    expect(req.headers.get('If-Match')).toBe('"3"');
    expect(req.headers.get('Idempotency-Key')).toBe('idem-9');
    expect(await req.json()).toEqual({ companyId: 'c1', branchId: 'b1', resolution: 'KEEP_SERVER', reason: 'Prevalece el servidor', confirmed: true });
  });

  it('errores de dominio llegan como SyncCommandError con status y code', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { statusCode: 409, code: 'SYNC_CONFLICT_ALREADY_RESOLVED', detail: 'ya resuelto' }));
    const err = await resolveSyncConflict('tok', makeConflict(), { companyId: 'c', branchId: 'b', resolution: 'KEEP_LOCAL' }).catch((e) => e);
    expect(err).toBeInstanceOf(SyncCommandError);
    expect(err.status).toBe(409);
    expect(err.problem.code).toBe('SYNC_CONFLICT_ALREADY_RESOLVED');
  });
});

describe('sync-errors', () => {
  const mk = (status: number, code?: string) => new SyncCommandError(status, code ? { code, detail: 'técnico' } : null);

  it('traduce TODOS los codigos del contrato a lenguaje de negocio (nunca el detalle tecnico)', () => {
    const codes = [
      'SYNC_SOURCE_NOT_FOUND', 'SYNC_CONFLICT_NOT_FOUND', 'SYNC_DRAFT_REJECTED', 'SYNC_DRAFT_EXPIRED', 'SYNC_PAYLOAD_INVALID',
      'SYNC_PAYMENT_ONLINE_ONLY', 'SYNC_RESOLVER_NOT_SUPPORTED', 'SYNC_CONFLICT_ALREADY_OPEN', 'SYNC_CONFLICT_ALREADY_RESOLVED',
      'SYNC_CONFLICT_VERSION_MISMATCH', 'SYNC_CONFIRMATION_REQUIRED', 'SYNC_REASON_REQUIRED', 'SYNC_MERGE_NOT_ALLOWED',
      'SYNC_CONFLICT_PENDING', 'ROLE_NOT_ALLOWED',
    ];
    for (const code of codes) {
      const msg = describeSyncError(mk(422, code), 'fallback');
      expect(msg, code).not.toBe('fallback');
      expect(msg, code).not.toContain('técnico');
      expect(msg, code).not.toMatch(/SYNC_|_/);
    }
  });

  it('412 se reconoce como version desactualizada y pide recargar', () => {
    expect(isSyncVersionMismatch(mk(412))).toBe(true);
    expect(isSyncVersionMismatch(mk(412, 'SYNC_CONFLICT_VERSION_MISMATCH'))).toBe(true);
    expect(shouldReloadSyncConflicts(mk(412))).toBe(true);
    expect(shouldReloadSyncConflicts(mk(409, 'SYNC_CONFLICT_ALREADY_RESOLVED'))).toBe(true);
    expect(shouldReloadSyncConflicts(mk(422, 'SYNC_REASON_REQUIRED'))).toBe(false);
    expect(describeSyncError(mk(412), 'f')).toMatch(/cambió/);
  });

  it('sin codigo usa el mensaje por estado o el fallback', () => {
    expect(describeSyncError(mk(403), 'f')).toMatch(/permiso/);
    expect(describeSyncError(mk(500), 'fallback')).toBe('fallback');
    expect(describeSyncError(new Error('x'), 'fallback')).toBe('fallback');
  });
});
