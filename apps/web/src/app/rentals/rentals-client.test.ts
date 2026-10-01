import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listRentals, getRental, createRental, validateDocuments, RentalApiError, RentalCommandError } from './rentals-client';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid' });
});

describe('rentals-client', () => {
  it('listRentals hace GET /rentals con companyId/branchId', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await listRentals('token', 'c1', 'b1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rentals?companyId=c1&branchId=b1'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    );
  });

  it('listRentals lanza RentalApiError en respuesta no OK', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(listRentals('token', 'c1', 'b1')).rejects.toBeInstanceOf(RentalApiError);
  });

  it('getRental hace GET /rentals/:id', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'r1' }) });
    const result = await getRental('token', 'r1', 'c1', 'b1');
    expect(result).toEqual({ id: 'r1' });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/rentals/r1?'), expect.any(Object));
  });

  it('createRental hace POST /rentals sin If-Match (recurso nuevo)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'r1' }) });
    await createRental('token', 'c1', 'b1', 'cust1', 'veh1');
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['If-Match']).toBeUndefined();
    expect(JSON.parse(options.body)).toMatchObject({ companyId: 'c1', branchId: 'b1', customerId: 'cust1', vehicleId: 'veh1' });
  });

  it('validateDocuments envia If-Match con la version y lanza RentalCommandError en 409', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ code: 'VERSION_MISMATCH' }) });
    await expect(validateDocuments('token', 'r1', 'c1', 'b1', 3)).rejects.toBeInstanceOf(RentalCommandError);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['If-Match']).toBe('"3"');
  });
});
