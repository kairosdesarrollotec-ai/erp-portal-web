import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listInquiries, getInquiry, createInquiry, quoteInquiry, convertInquiryToRental, InquiryApiError, InquiryCommandError } from './inquiries-client';

/**
 * Hallazgo de revision PR#11 ("Contexto incompleto" y "Verificacion
 * requerida: 401/403/409/422/5xx"): cubre que listInquiries manda
 * companyId+branchId, que los fallos de listInquiries/getInquiry se
 * traducen a InquiryApiError con el status real (para distinguir 401/403
 * de otros errores en vez de la comprobacion fragil por texto que usaba
 * useInquiriesList.ts antes), y que los comandos mutables mandan
 * Idempotency-Key (TDD-CON-001.md 15).
 */
function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
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

    const calledUrl = (fetchMock.mock.calls[0][0] as Request).url;
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

    const request = fetchMock.mock.calls[0][0] as Request;
    const body = await request.json();
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
    expect(request.headers.get('Idempotency-Key')).toBeTruthy();
  });

  it('un comando mutable manda un Idempotency-Key distinto en cada intento', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ id: 'con-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await quoteInquiry('token', 'con-1', 1, 'c1', 'b1', 'veh-1', 'Ayacucho', 3);
    await quoteInquiry('token', 'con-1', 2, 'c1', 'b1', 'veh-1', 'Ayacucho', 3);

    const firstRequest = fetchMock.mock.calls[0][0] as Request;
    const secondRequest = fetchMock.mock.calls[1][0] as Request;
    expect(firstRequest.headers.get('Idempotency-Key')).toBeTruthy();
    expect(firstRequest.headers.get('Idempotency-Key')).not.toBe(secondRequest.headers.get('Idempotency-Key'));
    expect(firstRequest.headers.get('If-Match')).toBe('"1"');
  });

  it('un comando mutable que falla lanza InquiryCommandError con el problem+json', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(412, { code: 'INQUIRY_VERSION_CONFLICT', detail: 'version distinta' }));

    await expect(quoteInquiry('token', 'con-1', 1, 'c1', 'b1', 'veh-1', 'Ayacucho', 3)).rejects.toMatchObject({
      status: 412,
      problem: { code: 'INQUIRY_VERSION_CONFLICT' },
    });
  });

  it('InquiryCommandError expone status y problem tal cual el backend', () => {
    const error = new InquiryCommandError(422, { code: 'BUSINESS_RULE', detail: 'motivo' });
    expect(error.status).toBe(422);
    expect(error.problem?.code).toBe('BUSINESS_RULE');
  });

  it('convertInquiryToRental hace POST a convert-to-rental con If-Match e Idempotency-Key y devuelve el rental', async () => {
    const fetchMock = mockFetchOnce(200, { rental: { id: 'rent-1', status: 'DRAFT', version: 1 } });
    vi.stubGlobal('fetch', fetchMock);

    const result = await convertInquiryToRental('token', 'con-1', 3, 'c1', 'b1');

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe('POST');
    expect(request.url).toContain('/inquiries/con-1/commands/convert-to-rental');
    expect(request.headers.get('If-Match')).toBe('"3"');
    expect(request.headers.get('Idempotency-Key')).toBeTruthy();
    expect(result.rental.id).toBe('rent-1');
  });

  it('convertInquiryToRental propaga el error de dominio como InquiryCommandError', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(422, { code: 'VEHICLE_NOT_AVAILABLE', detail: 'no disponible' }));

    await expect(convertInquiryToRental('token', 'con-1', 1, 'c1', 'b1')).rejects.toMatchObject({
      status: 422,
      problem: { code: 'VEHICLE_NOT_AVAILABLE' },
    });
  });
});

describe('V-26: error 400 de validación al cotizar', () => {
  it('InquiryCommandError muestra el detalle de validación del backend en vez de solo el código', () => {
    expect(new InquiryCommandError(400, { message: ['destination should not be empty', 'estimatedDays must be positive'] }).message).toBe(
      'destination should not be empty; estimatedDays must be positive',
    );
  });

  it('un 400 sin detalle explica qué revisar y no muestra solo «(400)»', () => {
    const message = new InquiryCommandError(400, null).message;
    expect(message).toContain('incompletos');
    expect(message).not.toContain('(400)');
  });

  it('otros códigos sin detalle mantienen el texto genérico', () => {
    expect(new InquiryCommandError(500, null).message).toBe('La operación no se pudo completar (500)');
  });
});
