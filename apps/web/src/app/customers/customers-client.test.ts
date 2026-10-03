import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
} from './customers-client';

function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

describe('customers-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listCustomers envía companyId, branchId y búsqueda en la URL', async () => {
    const fetchMock = mockFetchOnce(200, { items: [], total: 0 });
    vi.stubGlobal('fetch', fetchMock);

    await listCustomers('token', {
      companyId: 'comp-1',
      branchId: 'branch-1',
      search: 'Perez',
      limit: 10,
      offset: 0,
    });

    const calledUrl = (fetchMock.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain('companyId=comp-1');
    expect(calledUrl).toContain('branchId=branch-1');
    expect(calledUrl).toContain('search=Perez');
    expect(calledUrl).toContain('limit=10');
  });

  it('listCustomers lanza CustomerApiError en fallos HTTP', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(403, {}));

    await expect(
      listCustomers('token', { companyId: 'comp-1', branchId: 'branch-1' }),
    ).rejects.toMatchObject({
      name: 'CustomerApiError',
      status: 403,
    });
  });

  it('getCustomer obtiene el detalle del cliente', async () => {
    const mockCustomer = { id: 'cust-1', fullName: 'Juan Perez' };
    const fetchMock = mockFetchOnce(200, mockCustomer);
    vi.stubGlobal('fetch', fetchMock);

    const result = await getCustomer('token', 'cust-1', 'comp-1', 'branch-1');
    expect(result).toEqual(mockCustomer);
  });

  it('createCustomer envía el payload y headers de idempotencia', async () => {
    const fetchMock = mockFetchOnce(201, { id: 'cust-1', fullName: 'Ana Gomez' });
    vi.stubGlobal('fetch', fetchMock);

    const payload = {
      companyId: 'comp-1',
      branchId: 'branch-1',
      fullName: 'Ana Gomez',
      documentType: 'DNI',
      documentNumber: '87654321',
      email: 'ana@example.com',
    };

    const res = await createCustomer('token', payload, 'idem-key-1');
    expect(res.id).toBe('cust-1');

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.headers.get('Idempotency-Key')).toBe('idem-key-1');
    expect(request.headers.get('Authorization')).toBe('Bearer token');
    expect(await request.json()).toEqual(payload);
  });

  it('createCustomer lanza CustomerCommandError con el detalle del backend en error 409', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(409, {
      code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS',
      detail: 'Ya existe un cliente con DNI número 87654321 en esta empresa.',
    }));

    await expect(
      createCustomer('token', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        fullName: 'Ana Gomez',
        documentType: 'DNI',
        documentNumber: '87654321',
      }),
    ).rejects.toMatchObject({
      name: 'CustomerCommandError',
      status: 409,
      problem: { code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS' },
    });
  });


  it('updateCustomer envía PATCH con el payload al endpoint del cliente', async () => {
    const fetchMock = mockFetchOnce(200, { id: 'cust-1', fullName: 'Ana Gomez Editada' });
    vi.stubGlobal('fetch', fetchMock);

    const payload = {
      companyId: 'comp-1',
      branchId: 'branch-1',
      fullName: 'Ana Gomez Editada',
      documentType: 'DNI',
      documentNumber: '87654321',
      email: 'ana@example.com',
    };

    const res = await updateCustomer('token', 'cust-1', payload);
    expect(res.id).toBe('cust-1');

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/customers/cust-1');
    expect(request.method).toBe('PATCH');
    expect(await request.json()).toEqual(payload);
  });

  it('updateCustomer lanza CustomerCommandError con el detalle del backend en error 409', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(409, {
      code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS',
      detail: 'Ya existe un cliente con DNI número 87654321 en esta empresa.',
    }));

    await expect(
      updateCustomer('token', 'cust-1', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        fullName: 'Ana Gomez',
        documentType: 'DNI',
        documentNumber: '87654321',
      }),
    ).rejects.toMatchObject({
      name: 'CustomerCommandError',
      status: 409,
      problem: { code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS' },
    });
  });
});
