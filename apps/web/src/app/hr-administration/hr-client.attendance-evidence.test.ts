import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { HrCommandError, logAttendance } from './hr-client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const server = setupServer();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.listen({ onUnhandledRequest: 'error' } as any);
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('hr-client - logAttendance con evidencia (DEC-ADP-ATT-EVIDENCE-001)', () => {
  it('envia evidence y devuelve evidence/evidenceMissing; nunca deductionAmount', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/employees/emp-1/attendance`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            id: 'att-1',
            evidence: { kind: 'WHATSAPP_PHOTO', url: 'https://x.pe/f.jpg', capturedAtLocal: '2026-10-14T08:05:00', corroboratedBy: 'uid-1' },
            evidenceMissing: false,
          },
          { status: 201 },
        );
      }),
    );
    const saved = await logAttendance('tok', 'emp-1', {
      date: '2026-10-14',
      status: 'PRESENTE',
      evidence: { kind: 'WHATSAPP_PHOTO', url: 'https://x.pe/f.jpg', capturedAtLocal: '2026-10-14T08:05:00', note: 'grupo' },
    });
    expect(body?.evidence).toEqual({ kind: 'WHATSAPP_PHOTO', url: 'https://x.pe/f.jpg', capturedAtLocal: '2026-10-14T08:05:00', note: 'grupo' });
    expect(body).not.toHaveProperty('deductionAmount');
    expect(saved.evidenceMissing).toBe(false);
    expect(saved.evidence?.corroboratedBy).toBe('uid-1');
  });

  it('sin evidence no envia el campo', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/employees/emp-1/attendance`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 'att-1', evidence: null, evidenceMissing: true }, { status: 201 });
      }),
    );
    const saved = await logAttendance('tok', 'emp-1', { date: '2026-10-14', status: 'PRESENTE' });
    expect(body).not.toHaveProperty('evidence');
    expect(saved.evidenceMissing).toBe(true);
  });

  it('422 INVALID_ATTENDANCE_EVIDENCE llega como HrCommandError con el codigo', async () => {
    server.use(
      http.post(`${BASE_URL}/employees/emp-1/attendance`, () =>
        HttpResponse.json({ statusCode: 422, code: 'INVALID_ATTENDANCE_EVIDENCE', detail: 'mal formada' }, { status: 422 }),
      ),
    );
    const error = await logAttendance('tok', 'emp-1', {
      date: '2026-10-14',
      status: 'PRESENTE',
      evidence: { kind: 'WHATSAPP_PHOTO', capturedAtLocal: '2026-10-14T08:05:00' },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(HrCommandError);
    expect(error.status).toBe(422);
    expect(error.problem.code).toBe('INVALID_ATTENDANCE_EVIDENCE');
  });
});
