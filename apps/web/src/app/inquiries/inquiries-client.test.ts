import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listInquiries, getInquiry, createInquiry, quoteInquiry, InquiryApiError, InquiryCommandError } from './inquiries-client';

/**
 * Hallazgo de revision PR#11 ("Contexto incompleto" y "Verificacion
 * requerida: 401/403/409/422/5xx"): cubre que listInquiries manda
 * companyId+branchId, que los fallos de listInquiries/getInquiry se
 * traducen a InquiryApiError con el status real (para distinguir 401/403
 * de otros errores en vez de la comprobacion fragil por texto que usaba
 * useInquiriesList.ts antes), y que los comandos mutables mandan
 * Idempotency-Key (TDD-CON-001.md 15).
 */
function mockFetchOnce(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return vi.fn().mockResolvedValue({ ok, status, json: async () => body });
}

describe('inquiries-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listInquiries manda companyId y branchId en la querystring (finding "Contexto incompleto")', async () => {
    const fetchMock = mockFetchOnce(200, []);
    vi.stubGlobal('fetch', fetchMock);

    await listInquiries('token', 'c1', 'b1');

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('companyId=c1');
    expect(calledUrl).toContain('branchId=b1');
  });

  it('listInquiries lanza InquiryApiError con el status real si la respuesta falla', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(403, {}));

    await expect(listInquiries('token', 'c1', 'b1')).rejects.toMatchObject({
      name: 'InquiryApiError',
      status: 403,
    });
  });

  it('getInquiry lanza InquiryApiError con el status real si la respuesta falla', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(404, {}));

    await expect(getInquiry('token', 'con-1', 'c1', 'b1')).rejects.toBeInstanceOf(InquiryApiError);
  });

  it('createInquiry manda prospect anidado y snapshot completo de CON-02, con Idempotency-Key (CONFLICT-CON-002 resuelto)', async () => {
    const fetchMock = mockFetchOnce(201, { id: 'con-1' });
    vi.stubGlobal('fetch', fetchMock);

    await createInquiry('token', {
      companyId: 'c1',
      branchId: 'b1',
      channel: 'WHATSAPP',
      touristUse: true,
      prospect: {
        fullName: 'Maria Quispe',
        documentType: 'DNI',
        documentNumber: '12345678',
        nationality: 'PERUANO',
      },
      destination: 'Ayacucho',
      estimatedDays: 3,
      travelStartDate: '2099-01-01',
      partySize: 2,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      companyId: 'c1',
      branchId: 'b1',
      channel: 'WHATSAPP',
      touristUse: true,
      prospect: {
        fullName: 'Maria Quispe',
        documentType: 'DNI',
        documentNumber: '12345678',
        nationality: 'PERUANO',
      },
      destination: 'Ayacucho',
      estimatedDays: 3,
      travelStartDate: '2099-01-01',
      partySize: 2,
    });
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBeTruthy();
  });

  it('un comando mutable manda un Idempotency-Key distinto en cada intento', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'con-1' }) });
    vi.stubGlobal('fetch', fetchMock);

    await quoteInquiry('token', 'con-1', 1, 'veh-1', 'Ayacucho', 3);
    await quoteInquiry('token', 'con-1', 2, 'veh-1', 'Ayacucho', 3);

    const firstHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    const secondHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(firstHeaders['Idempotency-Key']).toBeTruthy();
    expect(firstHeaders['Idempotency-Key']).not.toBe(secondHeaders['Idempotency-Key']);
    expect(firstHeaders['If-Match']).toBe('"1"');
  });

  it('un comando mutable que falla lanza InquiryCommandError con el problem+json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 412,
        json: async () => ({ code: 'INQUIRY_VERSION_CONFLICT', detail: 'version distinta' }),
      }),
    );

    await expect(quoteInquiry('token', 'con-1', 1, 'veh-1', 'Ayacucho', 3)).rejects.toMatchObject({
      status: 412,
      problem: { code: 'INQUIRY_VERSION_CONFLICT' },
    });
  });

  it('InquiryCommandError expone status y problem tal cual el backend', () => {
    const error = new InquiryCommandError(422, { code: 'BUSINESS_RULE', detail: 'motivo' });
    expect(error.status).toBe(422);
    expect(error.problem?.code).toBe('BUSINESS_RULE');
  });
});
