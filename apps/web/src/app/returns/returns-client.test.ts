import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  requestReturnEvidenceUploadSession,
  uploadReturnEvidenceToGcs,
  recordReturnEvidence,
  listReturnEvidence,
  ReturnApiError,
  ReturnCommandError,
  ReturnEvidenceUploadError,
} from './returns-client';

const fetchMock = vi.fn();
const DOC = { signerName: 'Maria Quispe', signerIsHolder: true, signatureData: 'data:image/png;base64,xx' };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid' });
});

function lastCall() {
  const [url, options] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: url as string, options: options as RequestInit & { headers: Record<string, string> } };
}

describe('returns-client - lecturas', () => {
  it('listReturns hace GET /returns con companyId/branchId (aislamiento por sede)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await listReturns('token', 'c1', 'b1');
    const { url, options } = lastCall();
    expect(url).toContain('/returns?companyId=c1&branchId=b1');
    expect(options.headers.Authorization).toBe('Bearer token');
  });

  it('listReturns envia estado, limite y cursor keyset', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await listReturns('token', 'c1', 'b1', {
      status: 'CON_DANOS',
      limit: 20,
      cursor: { createdAt: '2026-10-01T00:00:00Z', id: 'r9' },
    });
    const { url } = lastCall();
    expect(url).toContain('status=CON_DANOS');
    expect(url).toContain('limit=20');
    expect(url).toContain('cursorId=r9');
    expect(url).toContain('cursorCreatedAt=');
  });

  it('listReturns lanza ReturnApiError en respuesta no OK', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(listReturns('token', 'c1', 'b1')).rejects.toBeInstanceOf(ReturnApiError);
  });

  it('getReturn hace GET /returns/:id con el contexto de sede', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'r1' }) });
    expect(await getReturn('token', 'r1', 'c1', 'b1')).toEqual({ id: 'r1' });
    expect(lastCall().url).toContain('/returns/r1?companyId=c1&branchId=b1');
  });

  it('listReturnEvidence hace GET /returns/:id/evidence', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await listReturnEvidence('token', 'r1', 'c1', 'b1');
    expect(lastCall().url).toContain('/returns/r1/evidence?companyId=c1&branchId=b1');
  });
});

describe('returns-client - comandos', () => {
  it('scheduleReturn hace POST /returns sin If-Match (recurso nuevo)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'r1' }) });
    await scheduleReturn('token', 'c1', 'b1', 'rent-1', '2026-10-05T10:00:00Z');
    const { url, options } = lastCall();
    expect(url).toMatch(/\/returns$/);
    expect(options.method).toBe('POST');
    expect(options.headers['If-Match']).toBeUndefined();
    expect(options.headers['Idempotency-Key']).toBe('fixed-uuid');
    expect(JSON.parse(options.body as string)).toMatchObject({ companyId: 'c1', branchId: 'b1', rentalId: 'rent-1' });
  });

  it('receiveProvisional hace POST /returns/receive-provisional con km y combustible', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'r1' }) });
    await receiveProvisional('token', 'c1', 'b1', 'rent-1', {
      mileageAtReturn: 100,
      fuelLevelAtReturn: 'FULL',
      customerPresent: false,
      notes: 'otra persona',
    });
    const { url, options } = lastCall();
    expect(url).toContain('/returns/receive-provisional');
    expect(JSON.parse(options.body as string)).toMatchObject({
      rentalId: 'rent-1',
      mileageAtReturn: 100,
      fuelLevelAtReturn: 'FULL',
      customerPresent: false,
      notes: 'otra persona',
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
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await call();
    const { url, options } = lastCall();
    expect(url).toContain(`/returns/r1/commands/${command}`);
    expect(options.headers['If-Match']).toBe('"3"');
    expect(JSON.parse(options.body as string)).toMatchObject({ companyId: 'c1', branchId: 'b1' });
  });

  it('lanza ReturnCommandError con el problem+json del backend', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ code: 'INCIDENT_STILL_OPEN', detail: 'incidencia abierta' }),
    });
    const error = await closeReturn('t', 'r1', 'c1', 'b1', 1, {}).catch((e) => e);
    expect(error).toBeInstanceOf(ReturnCommandError);
    expect(error.status).toBe(409);
    expect(error.problem.code).toBe('INCIDENT_STILL_OPEN');
  });

  it('complete-inspection envia el documento de responsabilidad; la relacion solo si no es el titular', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await completeInspection('t', 'r1', 'c1', 'b1', 3, {
      hasDamages: false,
      responsibilityDocument: { ...DOC, signerRelationToHolder: 'ignorada' },
    });
    expect(JSON.parse(lastCall().options.body as string).responsibilityDocument).toEqual({
      signerName: 'Maria Quispe',
      signerIsHolder: true,
      signatureData: 'data:image/png;base64,xx',
    });

    await completeInspection('t', 'r1', 'c1', 'b1', 3, {
      hasDamages: true,
      damagesDescription: 'Daño en: Frontal',
      responsibilityDocument: { signerName: 'Pedro', signerIsHolder: false, signerRelationToHolder: 'Hermano', signatureData: 'sig' },
    });
    const body = JSON.parse(lastCall().options.body as string);
    expect(body).toMatchObject({ hasDamages: true, damagesDescription: 'Daño en: Frontal' });
    expect(body.responsibilityDocument).toEqual({
      signerName: 'Pedro',
      signerIsHolder: false,
      signerRelationToHolder: 'Hermano',
      signatureData: 'sig',
    });
  });

  it('resolve-alcohol-escalation envia decision, marca de cliente rojo y notas', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await resolveAlcoholEscalation('t', 'r1', 'c1', 'b1', 3, { decision: 'CONTINUE_TO_INSPECTION', markCustomerRed: false, notes: 'Segunda prueba ok' });
    expect(JSON.parse(lastCall().options.body as string)).toEqual({
      companyId: 'c1',
      branchId: 'b1',
      decision: 'CONTINUE_TO_INSPECTION',
      markCustomerRed: false,
      notes: 'Segunda prueba ok',
    });
    expect(lastCall().options.headers['Idempotency-Key']).toBe('fixed-uuid');
  });

  it('charge-immobilization ya no envia dailyRate y assess-damage propaga customerAcceptsCost', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await chargeImmobilization('t', 'r1', 'c1', 'b1', 3, { damageId: 'd1', daysCharged: 2 });
    expect(JSON.parse(lastCall().options.body as string)).not.toHaveProperty('dailyRate');
    await assessDamage('t', 'r1', 'c1', 'b1', 3, { origin: 'AESTHETIC', severity: 'LEVE', damagedZone: 'CAPOT', customerAcceptsCost: true });
    expect(JSON.parse(lastCall().options.body as string)).toMatchObject({ customerAcceptsCost: true });
  });

  it('getCosmeticTariff consulta el tarifario del backend y devuelve sus items', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [{ code: 'CAPOT', name: 'Paño en el capot', pricePen: 200 }] }) });
    const items = await getCosmeticTariff('t', 'c1', 'b1');
    expect(items).toEqual([{ code: 'CAPOT', name: 'Paño en el capot', pricePen: 200 }]);
    expect(lastCall().url).toContain('/returns/cosmetic-tariff');
  });

  it('closeFinancial no envia notes si no se indican', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await closeFinancial('t', 'r1', 'c1', 'b1', 1, 1000, 0);
    expect(JSON.parse(lastCall().options.body as string)).not.toHaveProperty('notes');
  });
});

describe('returns-client - evidencia (URL firmada)', () => {
  it('requestReturnEvidenceUploadSession pide la URL firmada con tipo, zona y tamano', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ uploadUrl: 'https://gcs/u', objectUrl: 'https://gcs/o', expiresAt: 'x' }),
    });
    const session = await requestReturnEvidenceUploadSession('t', 'r1', 'c1', 'b1', 'PHOTO', 'FRONTAL', 'image/jpeg', 1234);
    expect(session.uploadUrl).toBe('https://gcs/u');
    const { url, options } = lastCall();
    expect(url).toContain('/returns/r1/evidence/upload-url');
    expect(options.headers['If-Match']).toBeUndefined();
    expect(JSON.parse(options.body as string)).toMatchObject({
      type: 'PHOTO',
      zone: 'FRONTAL',
      contentType: 'image/jpeg',
      contentLength: 1234,
    });
  });

  it('uploadReturnEvidenceToGcs hace PUT directo con el content-type del archivo', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const file = new File(['abc'], 'a.jpg', { type: 'image/jpeg' });
    await uploadReturnEvidenceToGcs('https://gcs/u', file);
    const { url, options } = lastCall();
    expect(url).toBe('https://gcs/u');
    expect(options.method).toBe('PUT');
    expect(options.headers['Content-Type']).toBe('image/jpeg');
  });

  it('uploadReturnEvidenceToGcs lanza ReturnEvidenceUploadError si GCS rechaza', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const file = new File(['abc'], 'a.jpg', { type: 'image/jpeg' });
    await expect(uploadReturnEvidenceToGcs('https://gcs/u', file)).rejects.toBeInstanceOf(ReturnEvidenceUploadError);
  });

  it('recordReturnEvidence registra el objectUrl en el backend', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'e1' }) });
    await recordReturnEvidence('t', 'r1', 'c1', 'b1', 'VIDEO', 'INTERIOR', 'https://gcs/o');
    const { url, options } = lastCall();
    expect(url).toMatch(/\/returns\/r1\/evidence$/);
    expect(JSON.parse(options.body as string)).toMatchObject({ type: 'VIDEO', zone: 'INTERIOR', objectUrl: 'https://gcs/o' });
  });
});
