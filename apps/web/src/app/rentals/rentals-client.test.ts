import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listRentals, getRental, createRental, validateDocuments, RentalApiError, RentalCommandError } from './rentals-client';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid' });
});

describe('rentals-client', () => {
  it('listRentals hace GET /rentals con companyId/branchId', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await listRentals('token', 'c1', 'b1');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/rentals?companyId=c1&branchId=b1');
    expect(request.headers.get('Authorization')).toBe('Bearer token');
  });

  it('listRentals lanza RentalApiError en respuesta no OK', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}));
    await expect(listRentals('token', 'c1', 'b1')).rejects.toBeInstanceOf(RentalApiError);
  });

  it('getRental hace GET /rentals/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'r1' }));
    const result = await getRental('token', 'r1', 'c1', 'b1');
    expect(result).toEqual({ id: 'r1' });
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/rentals/r1?');
  });

  it('createRental hace POST /rentals sin If-Match (recurso nuevo)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'r1' }));
    await createRental('token', 'c1', 'b1', 'cust1', 'veh1');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe('POST');
    expect(request.headers.get('If-Match')).toBeNull();
    const body = await request.json();
    expect(body).toMatchObject({ companyId: 'c1', branchId: 'b1', customerId: 'cust1', vehicleId: 'veh1' });
  });

  it('validateDocuments envia If-Match con la version y lanza RentalCommandError en 409', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { code: 'VERSION_MISMATCH' }));
    await expect(validateDocuments('token', 'r1', 'c1', 'b1', 3)).rejects.toBeInstanceOf(RentalCommandError);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.headers.get('If-Match')).toBe('"3"');
  });
});
