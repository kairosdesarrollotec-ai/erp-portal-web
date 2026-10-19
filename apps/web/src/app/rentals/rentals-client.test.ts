import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listRentals, getRental, createRental, validateDocuments, getContractTemplate, formalizeContract, registerAuthorizedDriver, registerCompanion, RentalApiError, RentalCommandError } from './rentals-client';

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

  it('getContractTemplate envia withCompanyDriver (no withDriver)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { variant: { holderType: 'LEGAL', withCompanyDriver: true } }));
    const r = await getContractTemplate('token', 'r1', 'c1', 'b1', { holderType: 'LEGAL', withCompanyDriver: true });
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('holderType=LEGAL');
    expect(request.url).toContain('withCompanyDriver=true');
    expect(request.url).not.toContain('withDriver=');
    expect(r.variant?.withCompanyDriver).toBe(true);
  });

  it('formalizeContract envia withCompanyDriver en el body y expone CONTRACT_VARIANT_DRIVER_CONFLICT', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'r1' }));
    await formalizeContract('token', 'r1', 'c1', 'b1', 3, 'DOC', '0.00', 'PEN', undefined, undefined, { holderType: 'NATURAL', withCompanyDriver: false });
    const body = await (fetchMock.mock.calls[0][0] as Request).json();
    expect(body).toMatchObject({ holderType: 'NATURAL', withCompanyDriver: false, depositAmount: '0.00' });
    expect(body).not.toHaveProperty('withDriver');
    fetchMock.mockResolvedValue(jsonResponse(400, { code: 'CONTRACT_VARIANT_DRIVER_CONFLICT' }));
    await expect(formalizeContract('token', 'r1', 'c1', 'b1', 3, 'DOC', '1', 'PEN')).rejects.toMatchObject({ status: 400, problem: { code: 'CONTRACT_VARIANT_DRIVER_CONFLICT' } });
  });

  it('formalizeContract NO envia garantia con conductor de la empresa', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'r1', deposit: null, depositRequired: false }));
    await formalizeContract('token', 'r1', 'c1', 'b1', 3, 'DOC', null, null, undefined, undefined, { holderType: 'LEGAL', withCompanyDriver: true });
    const body = await (fetchMock.mock.calls[0][0] as Request).json();
    expect(body).toMatchObject({ withCompanyDriver: true, holderType: 'LEGAL' });
    expect(body).not.toHaveProperty('depositAmount');
    expect(body).not.toHaveProperty('depositCurrency');
    // aunque se pase un monto, con conductor de la empresa se omite
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'r1' }));
    await formalizeContract('token', 'r1', 'c1', 'b1', 3, 'DOC', '500', 'PEN', undefined, undefined, { holderType: 'LEGAL', withCompanyDriver: true });
    expect(await (fetchMock.mock.calls[1][0] as Request).json()).not.toHaveProperty('depositAmount');
  });

  it('registerAuthorizedDriver hace POST con If-Match y body del conductor', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'r1', parties: [{ id: 'p', customerId: 'd1', role: 'DRIVER', addendumDocumentRef: 'AD-1' }] }));
    const r = await registerAuthorizedDriver('token', 'r1', 'c1', 'b1', 4, 'd1', 'AD-1', 'LEGAL');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe('POST');
    expect(request.url).toContain('/rentals/r1/commands/register-authorized-driver');
    expect(request.headers.get('If-Match')).toBe('"4"');
    expect(await request.json()).toEqual({ companyId: 'c1', branchId: 'b1', driverCustomerId: 'd1', addendumDocumentRef: 'AD-1', holderType: 'LEGAL' });
    expect(r.parties?.[0].addendumDocumentRef).toBe('AD-1');
  });

  it('registerAuthorizedDriver expone el codigo del 422', async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, { code: 'NATURAL_PERSON_OWN_DRIVER_NOT_ALLOWED' }));
    await expect(registerAuthorizedDriver('token', 'r1', 'c1', 'b1', 4, 'd1', 'AD-1')).rejects.toMatchObject({
      status: 422,
      problem: { code: 'NATURAL_PERSON_OWN_DRIVER_NOT_ALLOWED' },
    });
  });

  it('registerCompanion hace POST con If-Match, conductor real, checks de licencia, motivo y sin adenda si no se indica', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'r1', parties: [{ id: 'p', customerId: 'a1', role: 'RESPONSIBLE', addendumDocumentRef: null }] }));
    const r = await registerCompanion('token', 'r1', 'c1', 'b1', 4, 'a1', 'd1', true, true, 'Brevete extranjero no valido', undefined, 'NATURAL');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe('POST');
    expect(request.url).toContain('/rentals/r1/commands/register-companion');
    expect(request.headers.get('If-Match')).toBe('"4"');
    expect(await request.json()).toEqual({ companyId: 'c1', branchId: 'b1', companionCustomerId: 'a1', driverCustomerId: 'd1', companionLicenseVerified: true, driverLicenseVerified: true, reason: 'Brevete extranjero no valido', holderType: 'NATURAL' });
    expect(r.parties?.[0].role).toBe('RESPONSIBLE');
  });

  it('registerCompanion expone el codigo del 422', async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, { code: 'COMPANION_NOT_APPLICABLE_FOR_LEGAL_HOLDER' }));
    await expect(registerCompanion('token', 'r1', 'c1', 'b1', 4, 'a1', 'd1', true, true, 'motivo valido largo')).rejects.toMatchObject({
      status: 422,
      problem: { code: 'COMPANION_NOT_APPLICABLE_FOR_LEGAL_HOLDER' },
    });
  });
});
