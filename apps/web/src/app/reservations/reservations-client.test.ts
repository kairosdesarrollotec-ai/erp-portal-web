import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listReservations,
  getReservation,
  registerPayment,
  confirmReservation,
  ReservationApiError,
  ReservationCommandError,
} from './reservations-client';

/**
 * Hallazgo de revision (finding #1 y #7): antes no habia pruebas directas
 * de este cliente HTTP. Cubrimos aqui: (a) que listReservations manda
 * companyId+branchId como querystring, (b) que un fallo de red se traduce
 * a ReservationApiError con el status HTTP real (para poder distinguir
 * 401/403/404/5xx aguas arriba, finding #7), y (c) que todo comando
 * mutable manda un header Idempotency-Key distinto en cada llamada
 * (TDD-RES-001.md 11, finding #6).
 */
function mockFetchOnce(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
}

describe('reservations-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listReservations manda companyId y branchId en la querystring (finding #1)', async () => {
    const fetchMock = mockFetchOnce(200, []);
    vi.stubGlobal('fetch', fetchMock);

    await listReservations('token', 'c1', 'b1');

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('companyId=c1');
    expect(calledUrl).toContain('branchId=b1');
  });

  it('listReservations lanza ReservationApiError con el status real si la respuesta falla', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(403, {}));

    await expect(listReservations('token', 'c1', 'b1')).rejects.toMatchObject({
      name: 'ReservationApiError',
      status: 403,
    });
  });

  it('getReservation lanza ReservationApiError con el status real si la respuesta falla', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(404, {}));

    await expect(getReservation('token', 'res-1', 'c1', 'b1')).rejects.toBeInstanceOf(ReservationApiError);
  });

  it('un comando mutable manda un Idempotency-Key distinto en cada intento (finding #6)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'res-1' }) });
    vi.stubGlobal('fetch', fetchMock);

    await registerPayment('token', 'res-1', 'c1', 'b1', 1);
    await confirmReservation('token', 'res-1', 'c1', 'b1', 2);

    const firstHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    const secondHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(firstHeaders['Idempotency-Key']).toBeTruthy();
    expect(secondHeaders['Idempotency-Key']).toBeTruthy();
    expect(firstHeaders['Idempotency-Key']).not.toBe(secondHeaders['Idempotency-Key']);
    expect(firstHeaders['If-Match']).toBe('"1"');
  });

  it('un comando mutable que falla lanza ReservationCommandError con el problem+json (finding #7)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ code: 'REQUIREMENTS_INCOMPLETE', detail: 'faltan', missingRequirements: ['DOCUMENTS_COMPLETE'] }),
      }),
    );

    await expect(registerPayment('token', 'res-1', 'c1', 'b1', 1)).rejects.toMatchObject({
      status: 422,
      problem: { code: 'REQUIREMENTS_INCOMPLETE', missingRequirements: ['DOCUMENTS_COMPLETE'] },
    });
  });

  it('ReservationCommandError expone status y problem tal cual el backend', () => {
    const error = new ReservationCommandError(409, { code: 'VEHICLE_NOT_AVAILABLE', detail: 'conflicto' });
    expect(error.status).toBe(409);
    expect(error.problem?.code).toBe('VEHICLE_NOT_AVAILABLE');
  });
});
