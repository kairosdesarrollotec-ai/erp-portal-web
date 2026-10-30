import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ATTENDANCE_LOCATION_SENDING_ENABLED, ATTENDANCE_LOCATION_TIMEOUT_MS, captureAttendanceLocation } from './attendance-location';

type GeoSuccess = (p: { coords: { latitude: number; longitude: number; accuracy: number } }) => void;
type GeoError = (e: { code: number }) => void;

function mockGeolocation(impl: ((ok: GeoSuccess, ko: GeoError, opts?: PositionOptions) => void) | null) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: impl ? { getCurrentPosition: vi.fn(impl) } : undefined,
  });
}

describe('captureAttendanceLocation (HU-29, ubicación automática)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    mockGeolocation(null);
  });

  it('el envío al servidor está encendido (hr-administration 0.8.0 acepta latitude/longitude/accuracy)', () => {
    expect(ATTENDANCE_LOCATION_SENDING_ENABLED).toBe(true);
  });

  it('con permiso devuelve latitud, longitud y precisión, pidiendo un tiempo máximo corto', async () => {
    mockGeolocation((ok) => ok({ coords: { latitude: -13.16, longitude: -74.22, accuracy: 12 } }));
    await expect(captureAttendanceLocation()).resolves.toEqual({ latitude: -13.16, longitude: -74.22, accuracy: 12 });
    const call = (navigator.geolocation.getCurrentPosition as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[2]).toMatchObject({ timeout: ATTENDANCE_LOCATION_TIMEOUT_MS });
  });

  it('si el usuario niega el permiso devuelve null (no bloquea)', async () => {
    mockGeolocation((_ok, ko) => ko({ code: 1 }));
    await expect(captureAttendanceLocation()).resolves.toBeNull();
  });

  it('sin soporte del navegador devuelve null', async () => {
    mockGeolocation(null);
    await expect(captureAttendanceLocation()).resolves.toBeNull();
  });

  it('si el navegador nunca responde, se rinde al agotar el tiempo', async () => {
    mockGeolocation(() => undefined);
    const promise = captureAttendanceLocation(1000);
    await vi.advanceTimersByTimeAsync(1600);
    await expect(promise).resolves.toBeNull();
  });

  it('redondea lat/lng a 7 decimales y la precisión a 2 para cumplir el contrato del API', async () => {
    mockGeolocation((ok) => ok({ coords: { latitude: -12.046430123456789, longitude: -77.042793987654321, accuracy: 38.123456789 } }));
    await expect(captureAttendanceLocation()).resolves.toEqual({ latitude: -12.0464301, longitude: -77.042794, accuracy: 38.12 });
  });

  it('descarta coordenadas no numéricas y errores síncronos', async () => {
    mockGeolocation((ok) => ok({ coords: { latitude: Number.NaN, longitude: 1, accuracy: 1 } }));
    await expect(captureAttendanceLocation()).resolves.toBeNull();
    mockGeolocation(() => {
      throw new Error('boom');
    });
    await expect(captureAttendanceLocation()).resolves.toBeNull();
  });
});
