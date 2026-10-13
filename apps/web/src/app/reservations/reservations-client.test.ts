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
function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
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

    const calledUrl = (fetchMock.mock.calls[0][0] as Request).url;
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
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ id: 'res-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await registerPayment('token', 'res-1', 'c1', 'b1', 1);
    await confirmReservation('token', 'res-1', 'c1', 'b1', 2);

    const firstRequest = fetchMock.mock.calls[0][0] as Request;
    const secondRequest = fetchMock.mock.calls[1][0] as Request;
    expect(firstRequest.headers.get('Idempotency-Key')).toBeTruthy();
    expect(secondRequest.headers.get('Idempotency-Key')).toBeTruthy();
    expect(firstRequest.headers.get('Idempotency-Key')).not.toBe(secondRequest.headers.get('Idempotency-Key'));
    expect(firstRequest.headers.get('If-Match')).toBe('"1"');
  });

  it('un comando mutable que falla lanza ReservationCommandError con el problem+json (finding #7)', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(422, { code: 'REQUIREMENTS_INCOMPLETE', detail: 'faltan', missingRequirements: ['DOCUMENTS_COMPLETE'] }));

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

describe('reservations-client RES-07 (flag-sale / resolve-sale)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('flagVehicleSale manda If-Match, Idempotency-Key y solo los campos presentes', async () => {
    const { flagVehicleSale } = await import('./reservations-client');
    const fetchMock = mockFetchOnce(200, { id: 'r1' });
    vi.stubGlobal('fetch', fetchMock);
    await flagVehicleSale('tok', 'r1', 'c1', 'b1', 4, { alternativeVehicleId: 'v2' });
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(new URL(req.url).pathname).toBe('/reservations/r1/commands/flag-sale');
    expect(req.headers.get('If-Match')).toBe('"4"');
    expect(req.headers.get('Idempotency-Key')).toBeTruthy();
    expect(await req.json()).toEqual({ companyId: 'c1', branchId: 'b1', alternativeVehicleId: 'v2' });
  });

  it('resolveVehicleSale manda decision y traduce 422 a ReservationCommandError', async () => {
    const { resolveVehicleSale } = await import('./reservations-client');
    const fetchMock = mockFetchOnce(422, { code: 'ALTERNATIVE_VEHICLE_REQUIRED' });
    vi.stubGlobal('fetch', fetchMock);
    await expect(resolveVehicleSale('tok', 'r1', 'c1', 'b1', 4, 'ACCEPT_ALTERNATIVE')).rejects.toMatchObject({
      status: 422,
      problem: { code: 'ALTERNATIVE_VEHICLE_REQUIRED' },
    });
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(new URL(req.url).pathname).toBe('/reservations/r1/commands/resolve-sale');
    expect(await req.json()).toMatchObject({ decision: 'ACCEPT_ALTERNATIVE' });
  });

  it('changeReservationVehicle manda If-Match, Idempotency-Key y {companyId, branchId, vehicleId}', async () => {
    const { changeReservationVehicle } = await import('./reservations-client');
    const fetchMock = mockFetchOnce(200, { id: 'r1' });
    vi.stubGlobal('fetch', fetchMock);
    await changeReservationVehicle('tok', 'r1', 'c1', 'b1', 5, 'v2');
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(new URL(req.url).pathname).toBe('/reservations/r1/commands/change-vehicle');
    expect(req.headers.get('If-Match')).toBe('"5"');
    expect(req.headers.get('Idempotency-Key')).toBeTruthy();
    expect(await req.json()).toEqual({ companyId: 'c1', branchId: 'b1', vehicleId: 'v2' });
  });

  it('changeReservationVehicle traduce 422 ALTERNATIVE_VEHICLE_INVALID y 412 a ReservationCommandError', async () => {
    const { changeReservationVehicle, describeReservationError } = await import('./reservations-client');
    vi.stubGlobal('fetch', mockFetchOnce(422, { code: 'ALTERNATIVE_VEHICLE_INVALID' }));
    const err = await changeReservationVehicle('tok', 'r1', 'c1', 'b1', 5, 'v2').catch((e) => e);
    expect(err).toMatchObject({ status: 422, problem: { code: 'ALTERNATIVE_VEHICLE_INVALID' } });
    expect(describeReservationError(err)).toMatch(/alternativo no es válido/);
    vi.stubGlobal('fetch', mockFetchOnce(412, { code: 'RESERVATION_VERSION_CONFLICT' }));
    const err2 = await changeReservationVehicle('tok', 'r1', 'c1', 'b1', 5, 'v2').catch((e) => e);
    expect(err2.isVersionConflict).toBe(true);
  });

  it('describeReservationError prefiere el detail del back y cae al mensaje por código', async () => {
    const { describeReservationError } = await import('./reservations-client');
    expect(describeReservationError(new ReservationCommandError(409, { code: 'SALE_RESOLUTION_ALREADY_OPEN', detail: 'Detalle back' }))).toBe('Detalle back');
    expect(describeReservationError(new ReservationCommandError(409, { code: 'SALE_RESOLUTION_ALREADY_OPEN' }))).toMatch(/pendiente de resolver/);
  });
});
