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

describe('hr-client - subida de evidencia y vinculo de cuenta', () => {
  it('requestAttendanceEvidenceUploadUrl envia contentType/contentLength y devuelve storageRef', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/employees/emp-1/attendance/evidence/upload-url`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ uploadUrl: 'https://gcs.test/put', objectUrl: 'https://gcs.test/o', storageRef: 'gs://b/1.jpg', expiresAt: '2030-01-01T00:00:00Z' }, { status: 201 });
      }),
    );
    const { requestAttendanceEvidenceUploadUrl } = await import('./hr-client');
    const session = await requestAttendanceEvidenceUploadUrl('tok', 'emp-1', 'image/jpeg', 1234);
    expect(body).toEqual({ contentType: 'image/jpeg', contentLength: 1234 });
    expect(session.storageRef).toBe('gs://b/1.jpg');
  });

  it('uploadAttendanceEvidence hace PUT con el mismo Content-Type', async () => {
    let putType: string | null = null;
    server.use(
      http.post(`${BASE_URL}/employees/emp-1/attendance/evidence/upload-url`, () =>
        HttpResponse.json({ uploadUrl: 'https://gcs.test/put', objectUrl: 'o', storageRef: 'gs://b/2.png', expiresAt: '2030-01-01T00:00:00Z' }, { status: 201 }),
      ),
      http.put('https://gcs.test/put', ({ request }) => {
        putType = request.headers.get('content-type');
        return new HttpResponse(null, { status: 200 });
      }),
    );
    const { uploadAttendanceEvidence } = await import('./hr-client');
    const session = await uploadAttendanceEvidence('tok', 'emp-1', new File(['x'], 'a.png', { type: 'image/png' }));
    expect(putType).toBe('image/png');
    expect(session.storageRef).toBe('gs://b/2.png');
  });

  it('503 EVIDENCE_STORAGE_UNAVAILABLE se propaga como HrCommandError', async () => {
    server.use(
      http.post(`${BASE_URL}/employees/emp-1/attendance/evidence/upload-url`, () =>
        HttpResponse.json({ code: 'EVIDENCE_STORAGE_UNAVAILABLE' }, { status: 503 }),
      ),
    );
    const { requestAttendanceEvidenceUploadUrl } = await import('./hr-client');
    await expect(requestAttendanceEvidenceUploadUrl('tok', 'emp-1', 'image/webp', 10)).rejects.toMatchObject({ status: 503, problem: { code: 'EVIDENCE_STORAGE_UNAVAILABLE' } });
  });

  it('linkEmployeeAccount hace POST sin body; 409 se propaga', async () => {
    server.use(http.post(`${BASE_URL}/employees/emp-1/link-account`, () => HttpResponse.json({ id: 'emp-1', accountLinked: true }, { status: 200 })));
    const { linkEmployeeAccount } = await import('./hr-client');
    expect((await linkEmployeeAccount('tok', 'emp-1')).accountLinked).toBe(true);
    server.use(http.post(`${BASE_URL}/employees/emp-2/link-account`, () => HttpResponse.json({ code: 'EMPLOYEE_ACCOUNT_ALREADY_LINKED' }, { status: 409 })));
    await expect(linkEmployeeAccount('tok', 'emp-2')).rejects.toMatchObject({ status: 409, problem: { code: 'EMPLOYEE_ACCOUNT_ALREADY_LINKED' } });
  });
});
