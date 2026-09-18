import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWorkContextAssignments, selectWorkContext, WorkContextApiError } from './work-context-client';

/**
 * Hallazgo de revision (PR #8, findings #1 y #5): getWorkContextAssignments
 * debe distinguir un fallo tecnico (401/403/5xx, respuesta con forma
 * invalida) de una lista realmente vacia, y validar el contrato de la
 * respuesta en vez de hacer un cast directo del JSON.
 */
describe('work-context-client (TR-05)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve las asignaciones cuando la respuesta matchea el contrato', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        assignments: [{ companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' }],
      }),
    });

    const result = await getWorkContextAssignments('token');
    expect(result).toEqual([
      { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
    ]);
  });

  it('una lista realmente vacia (200, assignments: []) no lanza - es un resultado valido', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ assignments: [] }) });
    await expect(getWorkContextAssignments('token')).resolves.toEqual([]);
  });

  it.each([401, 403, 500])(
    'un %i lanza WorkContextApiError con el status correcto, nunca "lista vacia"',
    async (status) => {
      fetchMock.mockResolvedValue({ ok: false, status });
      const error = await getWorkContextAssignments('token').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(WorkContextApiError);
      expect((error as WorkContextApiError).status).toBe(status);
    },
  );

  it('una respuesta 200 con forma invalida (contrato roto) lanza WorkContextApiError, no pasa como datos validos', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ assignments: [{ companyId: 'c1' /* faltan campos requeridos */ }] }),
    });

    const error = await getWorkContextAssignments('token').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WorkContextApiError);
  });

  it('un fallo de red (fetch rechaza) se propaga tal cual - useWorkContext lo trata igual que un WorkContextApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getWorkContextAssignments('token')).rejects.toThrow('Failed to fetch');
  });

  it('selectWorkContext lanza WorkContextApiError con el status en un rechazo (ej. 403 de BR-ORG-002)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const error = await selectWorkContext('token', 'c1', 'b1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WorkContextApiError);
    expect((error as WorkContextApiError).status).toBe(403);
  });
});
