import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { HrCommandError, updateEmployee } from './hr-client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const server = setupServer();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.listen({ onUnhandledRequest: 'error' } as any);
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('hr-client - updateEmployee (contrato 0.6.0: If-Match + accountRelink)', () => {
  it('envia If-Match con la version leida, solo los campos cambiados, y devuelve accountRelink', async () => {
    let body: Record<string, unknown> | undefined;
    let ifMatch: string | null = null;
    server.use(
      http.patch(`${BASE_URL}/employees/emp-1`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        ifMatch = request.headers.get('if-match');
        return HttpResponse.json({
          id: 'emp-1',
          version: 4,
          accountLinked: true,
          accountRelink: { action: 'RELINKED', reason: 'EMAIL_CHANGED', previousEmail: 'a@x.pe', newEmail: 'b@x.pe' },
        });
      }),
    );
    const result = await updateEmployee('tok', 'emp-1', { email: 'b@x.pe' }, 3);
    expect(ifMatch).toBe('"3"');
    expect(body).toEqual({ email: 'b@x.pe' });
    expect(result.accountRelink?.action).toBe('RELINKED');
  });

  it('sin version no envia If-Match (compatibilidad)', async () => {
    let ifMatch: string | null = 'x';
    server.use(
      http.patch(`${BASE_URL}/employees/emp-1`, ({ request }) => {
        ifMatch = request.headers.get('if-match');
        return HttpResponse.json({ id: 'emp-1', version: 4 });
      }),
    );
    await updateEmployee('tok', 'emp-1', { jobTitle: 'Jefe' });
    expect(ifMatch).toBeNull();
  });

  it('412 y 409 llegan como HrCommandError con el code del servidor', async () => {
    server.use(
      http.patch(`${BASE_URL}/employees/emp-1`, () => HttpResponse.json({ statusCode: 412, code: 'EMPLOYEE_VERSION_CONFLICT', detail: 'x' }, { status: 412 })),
    );
    await expect(updateEmployee('tok', 'emp-1', { jobTitle: 'J' }, 2)).rejects.toMatchObject({ status: 412, problem: { code: 'EMPLOYEE_VERSION_CONFLICT' } });
    server.use(
      http.patch(`${BASE_URL}/employees/emp-1`, () => HttpResponse.json({ statusCode: 409, code: 'EMPLOYEE_ACCOUNT_ALREADY_LINKED', detail: 'x' }, { status: 409 })),
    );
    const err = await updateEmployee('tok', 'emp-1', { email: 'c@x.pe' }, 2).catch((e) => e);
    expect(err).toBeInstanceOf(HrCommandError);
    expect(err.problem.code).toBe('EMPLOYEE_ACCOUNT_ALREADY_LINKED');
  });
});
