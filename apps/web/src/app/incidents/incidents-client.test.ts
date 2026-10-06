import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  addIncidentAction,
  closeIncident,
  createIncident,
  getIncident,
  IncidentApiError,
  IncidentCommandError,
  listIncidents,
  referIncidentToLegal,
  resolveIncident,
} from './incidents-client';
import { makeDetail, makeIncident } from './test-utils';

function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

const requestOf = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls[0][0] as Request;

describe('incidents-client', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('listIncidents manda empresa/sede, filtros y cursor keyset en la querystring', async () => {
    const fetchMock = mockFetchOnce(200, [makeIncident()]);
    vi.stubGlobal('fetch', fetchMock);

    await listIncidents('tok', 'c1', 'b1', {
      type: 'KEY_LOSS',
      severity: 'LEVE',
      status: 'ABIERTA',
      rentalId: 'r1',
      limit: 20,
      cursor: { createdAt: '2026-10-05T10:00:00Z', id: 'inc-9' },
    });

    const url = new URL(requestOf(fetchMock).url);
    expect(url.pathname).toBe('/incidents');
    expect(url.searchParams.get('companyId')).toBe('c1');
    expect(url.searchParams.get('branchId')).toBe('b1');
    expect(url.searchParams.get('type')).toBe('KEY_LOSS');
    expect(url.searchParams.get('severity')).toBe('LEVE');
    expect(url.searchParams.get('status')).toBe('ABIERTA');
    expect(url.searchParams.get('rentalId')).toBe('r1');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('cursorCreatedAt')).toBe('2026-10-05T10:00:00Z');
    expect(url.searchParams.get('cursorId')).toBe('inc-9');
    expect(requestOf(fetchMock).headers.get('Authorization')).toBe('Bearer tok');
  });

  it('listIncidents y getIncident lanzan IncidentApiError con el status real', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(403, {}));
    await expect(listIncidents('tok', 'c1', 'b1')).rejects.toMatchObject({ name: 'IncidentApiError', status: 403 });

    vi.stubGlobal('fetch', mockFetchOnce(404, {}));
    const error = await getIncident('tok', 'x', 'c1', 'b1').catch((e) => e);
    expect(error).toBeInstanceOf(IncidentApiError);
    expect(error.status).toBe(404);
  });

  it('createIncident manda Idempotency-Key y omite los opcionales vacios', async () => {
    const fetchMock = mockFetchOnce(201, makeIncident());
    vi.stubGlobal('fetch', fetchMock);

    await createIncident('tok', 'c1', 'b1', {
      rentalId: 'r1',
      type: 'OTHER',
      severity: 'MODERADA',
      description: 'Rayón',
    });

    const req = requestOf(fetchMock);
    expect(req.method).toBe('POST');
    expect(req.headers.get('Idempotency-Key')).toBeTruthy();
    const body = await req.clone().json();
    expect(body).toEqual({ companyId: 'c1', branchId: 'b1', rentalId: 'r1', type: 'OTHER', severity: 'MODERADA', description: 'Rayón' });
  });

  it.each([
    ['addIncidentAction', 'add-action', () => addIncidentAction('tok', 'inc-1', 3, 'c1', 'b1', 'Llamada'), { description: 'Llamada' }],
    ['resolveIncident', 'resolve', () => resolveIncident('tok', 'inc-1', 3, 'c1', 'b1', 'Recuperada'), { resolutionSummary: 'Recuperada' }],
    ['closeIncident', 'close', () => closeIncident('tok', 'inc-1', 3, 'c1', 'b1', 'Cerrada'), { resolutionSummary: 'Cerrada' }],
    ['referIncidentToLegal', 'refer-legal', () => referIncidentToLegal('tok', 'inc-1', 3, 'c1', 'b1', 'Fuga'), { reason: 'Fuga' }],
  ])('%s llama a /commands/%s con If-Match "3" e Idempotency-Key', async (_name, command, call, extra) => {
    const fetchMock = mockFetchOnce(200, makeDetail());
    vi.stubGlobal('fetch', fetchMock);

    await call();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe(`/incidents/inc-1/commands/${command}`);
    expect(req.headers.get('If-Match')).toBe('"3"');
    expect(req.headers.get('Idempotency-Key')).toBeTruthy();
    expect(await req.clone().json()).toMatchObject({ companyId: 'c1', branchId: 'b1', ...extra });
  });

  it('los comandos traducen 409/422 a IncidentCommandError con el codigo del problema', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(422, { code: 'INCIDENT_DIRECT_RESOLVE_NOT_ALLOWED', detail: 'No' }));
    const error = await resolveIncident('tok', 'inc-1', 3, 'c1', 'b1', 'x').catch((e) => e);
    expect(error).toBeInstanceOf(IncidentCommandError);
    expect(error.status).toBe(422);
    expect(error.problem?.code).toBe('INCIDENT_DIRECT_RESOLVE_NOT_ALLOWED');

    vi.stubGlobal('fetch', mockFetchOnce(409, { code: 'VERSION_CONFLICT' }));
    await expect(closeIncident('tok', 'inc-1', 2, 'c1', 'b1', 'x')).rejects.toMatchObject({ status: 409 });
  });
});
