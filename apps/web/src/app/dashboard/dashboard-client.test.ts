import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDashboard, DashboardApiError } from './dashboard-client';

/**
 * Hallazgo de revision (PR #9, findings #1 y #5): getDashboard debe
 * validar el contrato de la respuesta con zod (no un cast directo) y
 * distinguir un fallo tecnico (401/403/404/5xx, respuesta invalida) de
 * datos validos.
 */
describe('dashboard-client (TR-06)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve el rol y el estado cuando la respuesta matchea el contrato', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ role: 'GERENCIA', state: 'EMPTY' }),
    });

    await expect(getDashboard('token', 'c1', 'b1')).resolves.toEqual({
      role: 'GERENCIA',
      state: 'EMPTY',
    });
  });

  it('el contrato tambien acepta READY (finding #1: el tipo no queda limitado permanentemente a EMPTY)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ role: 'FINANZAS', state: 'READY' }),
    });

    await expect(getDashboard('token', 'c1', 'b1')).resolves.toEqual({
      role: 'FINANZAS',
      state: 'READY',
    });
  });

  it.each([401, 403, 404, 500])(
    'un %i lanza DashboardApiError con el status correcto',
    async (status) => {
      fetchMock.mockResolvedValue({ ok: false, status });
      const error = await getDashboard('token', 'c1', 'b1').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DashboardApiError);
      expect((error as DashboardApiError).status).toBe(status);
    },
  );

  it('un rol o estado fuera del contrato lanza DashboardApiError, no pasa como datos validos', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ role: 'ROL_INVENTADO', state: 'EMPTY' }),
    });

    const error = await getDashboard('token', 'c1', 'b1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DashboardApiError);
  });
});
