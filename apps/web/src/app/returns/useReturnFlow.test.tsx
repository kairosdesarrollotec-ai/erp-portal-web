import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useReturnFlow } from './useReturnFlow';
import { ReturnApiError } from './returns-client';
import { baseContext, makeReturn } from './test-utils';

const getReturnMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return { ...actual, getReturn: (...args: unknown[]) => getReturnMock(...args) };
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={[{ pathname: '/devoluciones/ret-1/resultado', state: baseContext }]}>
      <Routes>
        <Route path="/devoluciones/:id/resultado" element={<>{children}</>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('useReturnFlow - aislamiento por sede', () => {
  beforeEach(() => getReturnMock.mockReset());

  it('carga el expediente con el contexto empresa/sede', async () => {
    getReturnMock.mockResolvedValue(makeReturn());
    const { result } = renderHook(() => useReturnFlow(), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('READY'));
    expect(getReturnMock).toHaveBeenCalledWith('fake-id-token', 'ret-1', 'c1', 'b1');
  });

  it('un expediente de otra sede se trata como NOT_FOUND', async () => {
    getReturnMock.mockResolvedValue(makeReturn({ branchId: 'b-otra' }));
    const { result } = renderHook(() => useReturnFlow(), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('NOT_FOUND'));
    expect(result.current.ret).toBeNull();
  });

  it('403/404 del backend se traducen a NOT_FOUND y otros errores a RECOVERABLE_ERROR', async () => {
    getReturnMock.mockRejectedValueOnce(new ReturnApiError(403));
    const first = renderHook(() => useReturnFlow(), { wrapper });
    await waitFor(() => expect(first.result.current.state).toBe('NOT_FOUND'));

    getReturnMock.mockRejectedValueOnce(new ReturnApiError(500));
    const second = renderHook(() => useReturnFlow(), { wrapper });
    await waitFor(() => expect(second.result.current.state).toBe('RECOVERABLE_ERROR'));
  });

  it('refresh actualiza version/etag sin pasar por LOADING', async () => {
    getReturnMock.mockResolvedValueOnce(makeReturn({ version: 2 }));
    const { result } = renderHook(() => useReturnFlow(), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('READY'));

    getReturnMock.mockResolvedValueOnce(makeReturn({ version: 3 }));
    await result.current.refresh();
    await waitFor(() => expect(result.current.ret?.version).toBe(3));
    expect(result.current.state).toBe('READY');
  });
});
