import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const q = vi.hoisted(() => ({ items: [] as unknown[] }));
vi.mock('../queue/evidence-upload-queue', () => ({
  getPendingEvidence: vi.fn(async () => q.items),
  getPendingEvidenceForReturn: vi.fn(async () => q.items),
  markEvidenceSynced: vi.fn(async () => undefined),
  markEvidenceFailed: vi.fn(async () => undefined),
}));
const rental = vi.hoisted(() => ({
  req: vi.fn(async () => ({ uploadUrl: 'u', objectUrl: 'o' })),
  put: vi.fn(async () => undefined),
  rec: vi.fn(async () => ({})),
}));
vi.mock('../../app/rentals/rentals-documents-client', () => ({
  requestEvidenceUploadSession: rental.req,
  uploadEvidenceToGcs: rental.put,
  recordEvidence: rental.rec,
}));
const ret = vi.hoisted(() => ({
  req: vi.fn(async () => ({ uploadUrl: 'u', objectUrl: 'o' })),
  put: vi.fn(async () => undefined),
  rec: vi.fn(async () => ({})),
}));
vi.mock('../../app/returns/returns-evidence-client', () => ({
  requestReturnEvidenceUploadSession: ret.req,
  uploadReturnEvidenceToGcs: ret.put,
  recordReturnEvidence: ret.rec,
}));

import { useSyncManager } from './use-sync-manager';
import { markEvidenceSynced } from '../queue/evidence-upload-queue';

const blob = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
const getIdToken = async () => 't';

describe('useSyncManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('DEV-04: sube items de devolucion a los endpoints de returns', async () => {
    q.items = [{ id: 1, returnId: 'ret-1', rentalId: null, type: 'PHOTO', zone: 'FRONTAL', mimeType: 'image/jpeg', blob, status: 'pending' }];
    const { result } = renderHook(() => useSyncManager({ returnId: 'ret-1', companyId: 'c', branchId: 'b', getIdToken }));
    act(() => result.current.triggerSync());
    await waitFor(() => expect(markEvidenceSynced).toHaveBeenCalledWith(1));
    expect(ret.req).toHaveBeenCalledWith('t', 'ret-1', 'c', 'b', 'PHOTO', 'FRONTAL', 'image/jpeg', 1);
    expect(ret.rec).toHaveBeenCalledWith('t', 'ret-1', 'c', 'b', 'PHOTO', 'FRONTAL', 'o');
    expect(rental.req).not.toHaveBeenCalled();
  });

  it('ENTREGA-04: sube items de alquiler a los endpoints de rentals', async () => {
    q.items = [{ id: 2, rentalId: 'r-1', returnId: null, type: 'VIDEO', zone: 'INTERIOR', mimeType: 'video/mp4', blob, status: 'pending' }];
    const { result } = renderHook(() => useSyncManager({ rentalId: 'r-1', companyId: 'c', branchId: 'b', getIdToken }));
    act(() => result.current.triggerSync());
    await waitFor(() => expect(markEvidenceSynced).toHaveBeenCalledWith(2));
    expect(rental.rec).toHaveBeenCalled();
    expect(ret.req).not.toHaveBeenCalled();
  });
});
