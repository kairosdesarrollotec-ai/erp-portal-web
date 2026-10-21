import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const flag = vi.hoisted(() => ({ enabled: false }));
vi.mock('./attendance-location', async (orig) => {
  const actual = await orig<typeof import('./attendance-location')>();
  return {
    ...actual,
    get ATTENDANCE_LOCATION_SENDING_ENABLED() {
      return flag.enabled;
    },
  };
});

import { logAttendance } from './hr-client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const server = setupServer();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.listen({ onUnhandledRequest: 'error' } as any);
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function send(location: { latitude: number; longitude: number; accuracy?: number } | null) {
  let body: Record<string, unknown> | undefined;
  server.use(
    http.post(`${BASE_URL}/employees/emp-1/attendance`, async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 'att-1', evidenceMissing: true }, { status: 201 });
    }),
  );
  await logAttendance('tok', 'emp-1', { date: '2026-10-14', status: 'PRESENTE', location });
  return body ?? {};
}

describe('hr-client.logAttendance - ubicación automática (HU-29, pendiente de back)', () => {
  it('con el envío apagado (contrato sin latitude/longitude) NO manda la ubicación', async () => {
    flag.enabled = false;
    const body = await send({ latitude: -13.16, longitude: -74.22, accuracy: 9 });
    expect(body).not.toHaveProperty('latitude');
    expect(body).not.toHaveProperty('longitude');
    expect(body).not.toHaveProperty('accuracy');
  });

  it('con el envío encendido manda latitude/longitude/accuracy opcionales', async () => {
    flag.enabled = true;
    expect(await send({ latitude: -13.16, longitude: -74.22, accuracy: 9 })).toMatchObject({ latitude: -13.16, longitude: -74.22, accuracy: 9 });
    expect(await send(null)).not.toHaveProperty('latitude'); // permiso negado: se registra igual, sin ubicación
  });
});
