import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const purgeMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('./expired-drafts', async (orig) => ({
  ...(await orig<typeof import('./expired-drafts')>()),
  purgeExpiredDrafts: (...a: unknown[]) => purgeMock.fn(...a),
}));
vi.mock('../../app/shared/local-drafts', () => ({ refreshLocalDraftCount: vi.fn().mockResolvedValue(undefined) }));

import { useExpiredDraftPurge } from './use-expired-draft-purge';
import { PURGE_INTERVAL_MS } from './expired-drafts';

const EMPTY = { drafts: 0, fieldEdits: 0, evidence: 0 };

describe('useExpiredDraftPurge', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    purgeMock.fn.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('purga al iniciar y avisa UNA vez cuando borró algo', async () => {
    purgeMock.fn.mockResolvedValueOnce({ drafts: 1, fieldEdits: 0, evidence: 2 }).mockResolvedValue(EMPTY);
    const { result } = renderHook(() => useExpiredDraftPurge());
    await act(async () => {
      await Promise.resolve();
    });
    expect(purgeMock.fn).toHaveBeenCalledTimes(1);
    expect(result.current.notice).toMatch(/72 horas/);

    act(() => result.current.dismiss());
    expect(result.current.notice).toBeNull();

    // las siguientes vueltas no vuelven a avisar si no hay nada que borrar
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS);
    });
    expect(purgeMock.fn).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toBeNull();
  });

  it('repite la purga cada 30 minutos y vuelve a avisar solo si borró algo nuevo', async () => {
    purgeMock.fn.mockResolvedValue(EMPTY);
    const { result } = renderHook(() => useExpiredDraftPurge());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.notice).toBeNull();

    purgeMock.fn.mockResolvedValueOnce({ drafts: 1, fieldEdits: 1, evidence: 0 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS);
    });
    expect(purgeMock.fn).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toMatch(/1 dato\(s\) sin enviar/);
  });

  it('si IndexedDB falla no rompe ni avisa, y deja de ejecutar al desmontar', async () => {
    purgeMock.fn.mockRejectedValue(new Error('IDB'));
    const { result, unmount } = renderHook(() => useExpiredDraftPurge());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.notice).toBeNull();
    unmount();
    await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS * 2);
    expect(purgeMock.fn).toHaveBeenCalledTimes(1);
  });
});
