import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  }),
}));

const mockGet = vi.fn();
vi.mock('../../../api/reporting-api-client', () => ({
  reportingApiClient: { GET: (...args: unknown[]) => mockGet(...args) },
}));

import { useFinancialKpis, useOperationalKpis, useExportReport } from './useReporting';
import { ReportingApiError } from '../reporting-errors';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useReporting — filtros dateFrom/dateTo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useFinancialKpis envía dateFrom y dateTo tal cual (YYYY-MM-DD)', async () => {
    mockGet.mockResolvedValue({ data: { kpis: {} }, error: undefined, response: { status: 200 } });
    const { result } = renderHook(
      () => useFinancialKpis({ companyId: 'c1', branchId: 'b1', dateFrom: '2026-10-01', dateTo: '2026-10-11' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(
      '/reporting/financial',
      expect.objectContaining({
        params: { query: { companyId: 'c1', branchId: 'b1', dateFrom: '2026-10-01', dateTo: '2026-10-11' } },
      }),
    );
  });

  it('useOperationalKpis: sin fechas no las envía', async () => {
    mockGet.mockResolvedValue({ data: { kpis: {} }, error: undefined, response: { status: 200 } });
    const { result } = renderHook(() => useOperationalKpis({ companyId: 'c1', branchId: 'b1' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet.mock.calls[0][1].params.query).toEqual({ companyId: 'c1', branchId: 'b1' });
  });

  it('un 400 con {code: RANGE_EXCEEDS_MAX} se propaga como ReportingApiError con code', async () => {
    mockGet.mockResolvedValue({
      data: undefined,
      error: { statusCode: 400, code: 'RANGE_EXCEEDS_MAX', detail: 'x' },
      response: { status: 400 },
    });
    const { result } = renderHook(
      () => useFinancialKpis({ companyId: 'c1', dateFrom: '2026-01-01', dateTo: '2026-12-31' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ReportingApiError);
    expect((result.current.error as ReportingApiError).code).toBe('RANGE_EXCEEDS_MAX');
    expect((result.current.error as ReportingApiError).status).toBe(400);
  });

  it('useExportReport: arma la URL con dateFrom/dateTo y propaga el code de un 400', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ statusCode: 400, code: 'INVALID_DATE_RANGE', detail: 'x' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const { result } = renderHook(() => useExportReport(), { wrapper });
      await act(async () => {
        result.current.mutate({ companyId: 'c1', branchId: 'b1', dateFrom: '2026-10-12', dateTo: '2026-10-11', type: 'combined' });
      });
      await waitFor(() => expect(result.current.isError).toBe(true));
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toBe('/reporting/export');
      expect(url.searchParams.get('dateFrom')).toBe('2026-10-12');
      expect(url.searchParams.get('dateTo')).toBe('2026-10-11');
      expect((result.current.error as ReportingApiError).code).toBe('INVALID_DATE_RANGE');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
