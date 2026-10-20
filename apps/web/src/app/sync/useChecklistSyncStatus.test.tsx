import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ status: vi.fn(), apply: vi.fn(async () => undefined) }));
vi.mock('./sync-client', () => ({ getChecklistSyncStatus: (...a: unknown[]) => h.status(...a) }));
vi.mock('../../offline/queue/sync-draft-store', () => ({ applyServerFieldRevisions: (...a: unknown[]) => h.apply(...a) }));

import { useChecklistSyncStatus } from './useChecklistSyncStatus';

const params = { checklistType: 'ENTREGA' as const, sourceId: 'r-1', companyId: 'c', branchId: 'b', getIdToken: async () => 'tok', enabled: true };

beforeEach(() => vi.clearAllMocks());

describe('useChecklistSyncStatus: fieldRevisions (sync.yaml 1.1.0)', () => {
  it('pasa la revision vigente por campo al borrador local, excluyendo los campos con conflicto abierto', async () => {
    const fieldRevisions = [{ key: 'fuel', rev: 2, value: 'FULL' }, { key: 'notes', rev: 1, value: 'x' }];
    h.status.mockResolvedValue({
      checklistType: 'ENTREGA', sourceId: 'r-1', status: 'SYNC_CONFLICT', serverConfirmedAt: null, stateVersion: 3,
      openConflicts: [{ kind: 'FIELD', key: 'notes' }, { kind: 'EVIDENCE', key: 'FRONTAL#1' }], fieldRevisions,
    });
    const { result } = renderHook(() => useChecklistSyncStatus(params));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(h.apply).toHaveBeenCalledWith('ENTREGA', 'r-1', fieldRevisions, { openConflictKeys: ['notes'] });
  });

  it('si el almacenamiento local falla igual muestra el estado del servidor', async () => {
    h.apply.mockRejectedValueOnce(new Error('idb'));
    h.status.mockResolvedValue({ checklistType: 'ENTREGA', sourceId: 'r-1', status: 'SYNCED', serverConfirmedAt: null, stateVersion: null, openConflicts: [], fieldRevisions: [] });
    const { result } = renderHook(() => useChecklistSyncStatus(params));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.error).toBeNull();
  });
});
