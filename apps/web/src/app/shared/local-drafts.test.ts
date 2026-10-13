import { describe, it, expect, vi } from 'vitest';

const countPendingAll = vi.fn();
vi.mock('../../offline/queue/evidence-upload-queue', () => ({ countPendingAll: () => countPendingAll() }));

describe('local-drafts', () => {
  it('getLocalDraftCount refleja el conteo tras refreshLocalDraftCount', async () => {
    const { getLocalDraftCount, refreshLocalDraftCount } = await import('./local-drafts');
    expect(getLocalDraftCount()).toBe(0);
    countPendingAll.mockResolvedValue(3);
    await refreshLocalDraftCount();
    expect(getLocalDraftCount()).toBe(3);
  });
});
