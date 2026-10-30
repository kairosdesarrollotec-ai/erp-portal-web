import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  listReturns,
  getReturn,
  scheduleReturn,
  receiveProvisional,
  registerReturnAlcoholTest,
  completeInspection,
  getCosmeticTariff,
  resolveAlcoholEscalation,
  assessDamage,
  chargeImmobilization,
  closeFinancial,
  closeReturn,
  registerReturnFuelPenalty,
  requestReturnEvidenceUploadSession,
  uploadReturnEvidenceToGcs,
  recordReturnEvidence,
  listReturnEvidence,
  listReturnReminders,
  listReturnAlerts,
  registerReturnReminder,
  recordMechanicReport,
  escalateLegal,
  ReturnApiError,
  ReturnCommandError,
  ReturnEvidenceUploadError,
} from './returns-client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const DOC = { signerName: 'Maria Quispe', signerIsHolder: true, signatureData: 'data:image/png;base64,xx' };

const server = setupServer();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.listen({ onUnhandledRequest: 'error' } as any);
  vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid' });
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe('returns-client - lecturas', () => {
  it('listReturns hace GET /returns con companyId/branchId (aislamiento por sede)', async () => {
    let capturedRequest: Request | undefined;
    server.use(
      http.get(`${BASE_URL}/returns`, ({ request }) => {
        capturedRequest = request;
        return HttpResponse.json([]);
      }),
    );
    await listReturns('token', 'c1', 'b1');
    const url = new URL(capturedRequest!.url);
    expect(url.searchParams.get('companyId')).toBe('c1');
    expect(url.searchParams.get('branchId')).toBe('b1');
    expect(capturedRequest!.headers.get('Authorization')).toBe('Bearer token');
  });

  it('listReturns envia estado, limite y cursor keyset', async () => {
    let capturedRequest: Request | undefined;
    server.use(
      http.get(`${BASE_URL}/returns`, ({ request }) => {
        capturedRequest = request;
        return HttpResponse.json([]);
      }),
    );
    await listReturns('token', 'c1', 'b1', {
      status: 'CON_DANOS',
      limit: 20,
      cursor: { createdAt: '2026-10-01T00:00:00Z', id: 'r9' },
    });
    const url = new URL(capturedRequest!.url);
    expect(url.searchParams.get('status')).toBe('CON_DANOS');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('cursorId')).toBe('r9');
    expect(url.searchParams.get('cursorCreatedAt')).toBeTruthy();
  });

  it('listReturns lanza ReturnApiError en respuesta no OK', async () => {
    server.use(
      http.get(`${BASE_URL}/returns`, () => new HttpResponse(null, { status: 500 })),
    );
    await expect(listReturns('token', 'c1', 'b1')).rejects.toBeInstanceOf(ReturnApiError);
  });

  it('getReturn hace GET /returns/:id con el contexto de sede', async () => {
    server.use(
      http.get(`${BASE_URL}/returns/r1`, () => HttpResponse.json({ id: 'r1' })),
    );
    expect(await getReturn('token', 'r1', 'c1', 'b1')).toMatchObject({ id: 'r1' });
  });

  it('listReturnEvidence hace GET /returns/:id/evidence', async () => {
    let capturedRequest: Request | undefined;
    server.use(
      http.get(`${BASE_URL}/returns/r1/evidence`, ({ request }) => {
        capturedRequest = request;
        return HttpResponse.json([]);
      }),
    );
    await listReturnEvidence('token', 'r1', 'c1', 'b1');
    const url = new URL(capturedRequest!.url);
    expect(url.searchParams.get('companyId')).toBe('c1');
    expect(url.searchParams.get('branchId')).toBe('b1');
  });
});

describe('returns-client - comandos', () => {
  it('scheduleReturn hace POST /returns sin If-Match (recurso nuevo)', async () => {
    let capturedRequest: Request | undefined;
    server.use(
      http.post(`${BASE_URL}/returns`, async ({ request }) => {
        capturedRequest = request.clone();
        return HttpResponse.json({ id: 'r1' }, { status: 201 });
      }),
    );
    await scheduleReturn('token', 'c1', 'b1', 'rent-1', '2026-10-05T10:00:00Z');
    expect(capturedRequest!.headers.get('If-Match')).toBeNull();
    expect(capturedRequest!.headers.get('Idempotency-Key')).toBe('fixed-uuid');
    const body = await capturedRequest!.json();
    expect(body).toMatchObject({ companyId: 'c1', branchId: 'b1', rentalId: 'rent-1' });
  });

  it('receiveProvisional hace POST /returns/receive-provisional con km y combustible', async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE_URL}/returns/receive-provisional`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: 'r1' }, { status: 201 });
      }),
    );
    await receiveProvisional('token', 'c1', 'b1', 'rent-1', {
      mileageAtReturn: 100,
      fuelLevelAtReturn: 'FULL',
      customerPresent: false,
      notes: 'otra persona',
      identityVerified: true,
      identityDocumentType: 'DNI',
      identityDocumentNumber: '12345678',
      identityMatchesHolder: true,
      identityResult: 'CONFORME',
    });
    expect(capturedBody).toMatchObject({
      rentalId: 'rent-1',
      mileageAtReturn: 100,
      fuelLevelAtReturn: 'FULL',
      customerPresent: false,
      notes: 'otra persona',
      identityVerified: true,
      identityDocumentType: 'DNI',
      identityDocumentNumber: '12345678',
      identityMatchesHolder: true,
      identityResult: 'CONFORME',
    });
  });

  it.each([
    ['register-alcohol-test', () => registerReturnAlcoholTest('t', 'r1', 'c1', 'b1', 3, 'FAVORABLE')],
    ['complete-inspection', () => completeInspection('t', 'r1', 'c1', 'b1', 3, { hasDamages: false, responsibilityDocument: DOC })],
    ['resolve-alcohol-escalation', () => resolveAlcoholEscalation('t', 'r1', 'c1', 'b1', 3, { decision: 'KEEP_IN_CUSTODY', markCustomerRed: true, notes: 'motivo' })],
    ['assess-damage', () => assessDamage('t', 'r1', 'c1', 'b1', 3, { origin: 'AESTHETIC', severity: 'LEVE', damagedZone: 'CAPOT' })],
    ['charge-immobilization', () => chargeImmobilization('t', 'r1', 'c1', 'b1', 3, { daysCharged: 1 })],
    ['close-financial', () => closeFinancial('t', 'r1', 'c1', 'b1', 3, 900, 100)],
    ['close', () => closeReturn('t', 'r1', 'c1', 'b1', 3, {})],
  ])('%s envia If-Match con la version y el contexto de sede', async (command, call) => {
    let capturedRequest: Request | undefined;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/${command}`, async ({ request }) => {
        capturedRequest = request.clone();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await call();
    expect(capturedRequest!.headers.get('If-Match')).toBe('"3"');
    const body = await capturedRequest!.json();
    expect(body).toMatchObject({ companyId: 'c1', branchId: 'b1' });
  });

  it('lanza ReturnCommandError con el problem+json del backend', async () => {
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/close`, () =>
        HttpResponse.json({ code: 'INCIDENT_STILL_OPEN', detail: 'incidencia abierta' }, { status: 409 }),
      ),
    );
    const error = await closeReturn('t', 'r1', 'c1', 'b1', 1, {}).catch((e) => e);
    expect(error).toBeInstanceOf(ReturnCommandError);
    expect(error.status).toBe(409);
    expect(error.problem.code).toBe('INCIDENT_STILL_OPEN');
  });

  it('complete-inspection envia el documento de responsabilidad; la relacion solo si no es el titular', async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/complete-inspection`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await completeInspection('t', 'r1', 'c1', 'b1', 3, {
      hasDamages: false,
      responsibilityDocument: { ...DOC, signerRelationToHolder: 'ignorada' },
    });
    expect(capturedBody!.responsibilityDocument).toEqual({
      signerName: 'Maria Quispe',
      signerIsHolder: true,
      signatureData: 'data:image/png;base64,xx',
    });

    server.resetHandlers();
    let capturedBody2: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/complete-inspection`, async ({ request }) => {
        capturedBody2 = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await completeInspection('t', 'r1', 'c1', 'b1', 3, {
      hasDamages: true,
      damagesDescription: 'Daño en: Frontal',
      responsibilityDocument: { signerName: 'Pedro', signerIsHolder: false, signerRelationToHolder: 'Hermano', signatureData: 'sig' },
    });
    expect(capturedBody2).toMatchObject({ hasDamages: true, damagesDescription: 'Daño en: Frontal' });
    expect(capturedBody2!.responsibilityDocument).toEqual({
      signerName: 'Pedro',
      signerIsHolder: false,
      signerRelationToHolder: 'Hermano',
      signatureData: 'sig',
    });
  });

  it('resolve-alcohol-escalation envia decision, marca de cliente rojo y notas', async () => {
    let capturedBody: unknown;
    let capturedIdempotencyKey: string | null = null;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/resolve-alcohol-escalation`, async ({ request }) => {
        capturedBody = await request.json();
        capturedIdempotencyKey = request.headers.get('Idempotency-Key');
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await resolveAlcoholEscalation('t', 'r1', 'c1', 'b1', 3, { decision: 'CONTINUE_TO_INSPECTION', markCustomerRed: false, notes: 'Segunda prueba ok' });
    expect(capturedBody).toEqual({
      companyId: 'c1',
      branchId: 'b1',
      decision: 'CONTINUE_TO_INSPECTION',
      markCustomerRed: false,
      notes: 'Segunda prueba ok',
    });
    expect(capturedIdempotencyKey).toBe('fixed-uuid');
  });

  it('charge-immobilization ya no envia dailyRate y assess-damage propaga customerAcceptsCost', async () => {
    let bodyCharge: unknown;
    let bodyDamage: unknown;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/charge-immobilization`, async ({ request }) => {
        bodyCharge = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
      http.post(`${BASE_URL}/returns/r1/commands/assess-damage`, async ({ request }) => {
        bodyDamage = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await chargeImmobilization('t', 'r1', 'c1', 'b1', 3, { damageId: 'd1', daysCharged: 2 });
    expect(bodyCharge).not.toHaveProperty('dailyRate');
    await assessDamage('t', 'r1', 'c1', 'b1', 3, { origin: 'AESTHETIC', severity: 'LEVE', damagedZone: 'CAPOT', customerAcceptsCost: true });
    expect(bodyDamage).toMatchObject({ customerAcceptsCost: true });
  });

  it('getCosmeticTariff consulta el tarifario del backend y devuelve sus items', async () => {
    let capturedRequest: Request | undefined;
    server.use(
      http.get(`${BASE_URL}/returns/cosmetic-tariff`, ({ request }) => {
        capturedRequest = request;
        return HttpResponse.json({ items: [{ code: 'CAPOT', name: 'Paño en el capot', pricePen: 200 }] });
      }),
    );
    const items = await getCosmeticTariff('t', 'c1', 'b1');
    expect(items).toEqual([{ code: 'CAPOT', name: 'Paño en el capot', pricePen: 200 }]);
    expect(new URL(capturedRequest!.url).pathname).toContain('/returns/cosmetic-tariff');
  });

  it('closeFinancial no envia notes si no se indican', async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/close-financial`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await closeFinancial('t', 'r1', 'c1', 'b1', 1, 1000, 0);
    expect(capturedBody).not.toHaveProperty('notes');
  });

  it('registerReturnFuelPenalty envia If-Match con la version, contexto de sede y motivo', async () => {
    let capturedBody: unknown;
    let capturedIfMatch: string | null = null;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/register-fuel-penalty`, async ({ request }) => {
        capturedBody = await request.json();
        capturedIfMatch = request.headers.get('If-Match');
        return HttpResponse.json({}, { status: 200 });
      }),
    );
    await registerReturnFuelPenalty('t', 'r1', 'c1', 'b1', 4, 150, 'Faltan 3 líneas según odómetro');
    expect(capturedIfMatch).toBe('"4"');
    expect(capturedBody).toEqual({
      companyId: 'c1',
      branchId: 'b1',
      amount: 150,
      reason: 'Faltan 3 líneas según odómetro',
    });
  });
});

describe('returns-client - evidencia (URL firmada)', () => {
  it('requestReturnEvidenceUploadSession pide la URL firmada con tipo, zona y tamano', async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE_URL}/returns/r1/evidence/upload-url`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ uploadUrl: 'https://gcs/u', objectUrl: 'https://gcs/o', expiresAt: 'x' }, { status: 201 });
      }),
    );
    const session = await requestReturnEvidenceUploadSession('t', 'r1', 'c1', 'b1', 'PHOTO', 'FRONTAL', 'image/jpeg', 1234);
    expect(session.uploadUrl).toBe('https://gcs/u');
    expect(capturedBody).toMatchObject({
      type: 'PHOTO',
      zone: 'FRONTAL',
      contentType: 'image/jpeg',
      contentLength: 1234,
    });
  });

  it('uploadReturnEvidenceToGcs hace PUT directo con el content-type del archivo', async () => {
    server.use(
      http.put('https://gcs/u', () => new HttpResponse(null, { status: 200 })),
    );
    const file = new File(['abc'], 'a.jpg', { type: 'image/jpeg' });
    await uploadReturnEvidenceToGcs('https://gcs/u', file);
  });

  it('uploadReturnEvidenceToGcs lanza ReturnEvidenceUploadError si GCS rechaza', async () => {
    server.use(
      http.put('https://gcs/u', () => new HttpResponse(null, { status: 403 })),
    );
    const file = new File(['abc'], 'a.jpg', { type: 'image/jpeg' });
    await expect(uploadReturnEvidenceToGcs('https://gcs/u', file)).rejects.toBeInstanceOf(ReturnEvidenceUploadError);
  });

  it('recordReturnEvidence registra el objectUrl en el backend', async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE_URL}/returns/r1/evidence`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: 'e1' }, { status: 201 });
      }),
    );
    await recordReturnEvidence('t', 'r1', 'c1', 'b1', 'VIDEO', 'INTERIOR', 'https://gcs/o');
    expect(capturedBody).toMatchObject({ type: 'VIDEO', zone: 'INTERIOR', objectUrl: 'https://gcs/o' });
  });
});

describe('returns-client - recordatorios y alertas', () => {
  it('listReturnReminders hace GET /returns/reminders con sede, status y limit', async () => {
    let captured: Request | undefined;
    server.use(
      http.get(`${BASE_URL}/returns/reminders`, ({ request }) => {
        captured = request;
        return HttpResponse.json([{ returnId: 'r1' }]);
      }),
    );
    const items = await listReturnReminders('token', 'c1', 'b1', { status: 'FAILED', limit: 10 });
    const url = new URL(captured!.url);
    expect(url.searchParams.get('companyId')).toBe('c1');
    expect(url.searchParams.get('branchId')).toBe('b1');
    expect(url.searchParams.get('status')).toBe('FAILED');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(captured!.headers.get('Authorization')).toBe('Bearer token');
    expect(items).toHaveLength(1);
  });

  it('listReturnReminders sin status no lo envia y lanza ReturnApiError ante 403', async () => {
    let captured: Request | undefined;
    server.use(
      http.get(`${BASE_URL}/returns/reminders`, ({ request }) => {
        captured = request;
        return HttpResponse.json({ code: 'ROLE_NOT_ALLOWED' }, { status: 403 });
      }),
    );
    const error = await listReturnReminders('t', 'c1', 'b1').catch((e) => e);
    expect(new URL(captured!.url).searchParams.has('status')).toBe(false);
    expect(error).toBeInstanceOf(ReturnApiError);
    expect(error.status).toBe(403);
  });

  it('registerReturnReminder envia If-Match = etag del recordatorio, Idempotency-Key y el cuerpo', async () => {
    let captured: Request | undefined;
    let body: unknown;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/register-reminder`, async ({ request }) => {
        captured = request.clone();
        body = await request.json();
        return HttpResponse.json({ id: 'rem-1', status: 'FAILED' });
      }),
    );
    const result = await registerReturnReminder('t', 'r1', 'c1', 'b1', '"4"', { result: 'FAILED', note: 'No contesta' });
    expect(captured!.headers.get('If-Match')).toBe('"4"');
    expect(captured!.headers.get('Idempotency-Key')).toBe('fixed-uuid');
    expect(body).toEqual({ companyId: 'c1', branchId: 'b1', result: 'FAILED', note: 'No contesta' });
    expect(result.status).toBe('FAILED');
  });

  it('registerReturnReminder entrecomilla un etag sin comillas y envia sentAt', async () => {
    let captured: Request | undefined;
    let body: unknown;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/register-reminder`, async ({ request }) => {
        captured = request.clone();
        body = await request.json();
        return HttpResponse.json({ id: 'rem-1', status: 'SENT' });
      }),
    );
    await registerReturnReminder('t', 'r1', 'c1', 'b1', '2', { result: 'SENT', sentAt: '2026-10-14T15:00:00.000Z' });
    expect(captured!.headers.get('If-Match')).toBe('"2"');
    expect(body).toEqual({ companyId: 'c1', branchId: 'b1', result: 'SENT', sentAt: '2026-10-14T15:00:00.000Z' });
  });

  it.each([
    [404, 'RETURN_REMINDER_NOT_FOUND'],
    [409, 'RETURN_REMINDER_ALREADY_SENT'],
    [412, 'RETURN_REMINDER_VERSION_CONFLICT'],
    [422, 'INVALID_RETURN_REMINDER_RESULT'],
  ])('registerReturnReminder traduce %s %s a ReturnCommandError', async (status, code) => {
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/register-reminder`, () =>
        HttpResponse.json({ statusCode: status, code, detail: 'detalle' }, { status }),
      ),
    );
    const error = await registerReturnReminder('t', 'r1', 'c1', 'b1', '"1"', { result: 'SENT' }).catch((e) => e);
    expect(error).toBeInstanceOf(ReturnCommandError);
    expect(error.status).toBe(status);
    expect(error.problem.code).toBe(code);
  });

  it('listReturnAlerts hace GET /returns/alerts con type opcional', async () => {
    let captured: Request | undefined;
    server.use(
      http.get(`${BASE_URL}/returns/alerts`, ({ request }) => {
        captured = request;
        return HttpResponse.json([]);
      }),
    );
    await listReturnAlerts('token', 'c1', 'b1', { type: 'IMMOBILIZATION' });
    const url = new URL(captured!.url);
    expect(url.searchParams.get('companyId')).toBe('c1');
    expect(url.searchParams.get('branchId')).toBe('b1');
    expect(url.searchParams.get('type')).toBe('IMMOBILIZATION');

    await listReturnAlerts('token', 'c1', 'b1');
    expect(new URL(captured!.url).searchParams.has('type')).toBe(false);
  });

  it('listReturnAlerts lanza ReturnApiError ante 500', async () => {
    server.use(http.get(`${BASE_URL}/returns/alerts`, () => HttpResponse.json({}, { status: 500 })));
    await expect(listReturnAlerts('t', 'c1', 'b1')).rejects.toBeInstanceOf(ReturnApiError);
  });
});

describe('returns-client - cuerpo segun contrato returns.yaml (DEV-10)', () => {
  it('record-mechanic-report envia la observacion como `notes` (el back rechaza campos extra con 400)', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/record-mechanic-report`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 'r1' });
      }),
    );
    await recordMechanicReport('t', 'r1', 'c1', 'b1', 2, { accepted: true, observation: 'Aceptado por el cliente' });
    expect(body).toEqual({ companyId: 'c1', branchId: 'b1', accepted: true, notes: 'Aceptado por el cliente' });
  });

  it('escalate-legal envia un unico `notes` con el motivo y el numero de caso', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/returns/r1/commands/escalate-legal`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 'r1' });
      }),
    );
    await escalateLegal('t', 'r1', 'c1', 'b1', 2, { reason: 'Apropiacion ilicita', legalCaseNumber: 'CASO-99' });
    expect(body).toEqual({ companyId: 'c1', branchId: 'b1', notes: 'Apropiacion ilicita (Caso legal N.° CASO-99)' });
    expect(body).not.toHaveProperty('reason');
  });
});
