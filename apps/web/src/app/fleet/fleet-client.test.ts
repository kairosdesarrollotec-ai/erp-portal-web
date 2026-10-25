import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicleStatus,
  requestPhotoUploadSession,
  uploadPhotoToGcs,
  FleetApiError,
  FleetCommandError,
  GcsUploadError,
} from './fleet-client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fleet-client', () => {
  describe('listVehicles', () => {
    it('envía los parámetros de consulta correctos con Bearer token', async () => {
      let capturedRequest: Request | undefined;

      server.use(
        http.get(`${BASE_URL}/fleet/vehicles`, ({ request }) => {
          capturedRequest = request;
          return HttpResponse.json({ items: [], total: 0 });
        }),
      );

      const result = await listVehicles('token-123', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        status: 'AVAILABLE',
        search: 'Hilux',
      });

      expect(capturedRequest?.headers.get('Authorization')).toBe('Bearer token-123');
      const url = new URL(capturedRequest!.url);
      expect(url.searchParams.get('companyId')).toBe('comp-1');
      expect(url.searchParams.get('branchId')).toBe('branch-1');
      expect(url.searchParams.get('status')).toBe('AVAILABLE');
      expect(url.searchParams.get('search')).toBe('Hilux');
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('envía availableFrom/availableTo solo cuando vienen ambos', async () => {
      const captured: Request[] = [];
      server.use(
        http.get(`${BASE_URL}/fleet/vehicles`, ({ request }) => {
          captured.push(request);
          return HttpResponse.json({ items: [], total: 0 });
        }),
      );

      await listVehicles('t', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        availableFrom: '2026-09-20T00:00:00.000Z',
        availableTo: '2026-09-23T00:00:00.000Z',
      });
      await listVehicles('t', { companyId: 'comp-1', branchId: 'branch-1', availableFrom: '2026-09-20T00:00:00.000Z' });

      const first = new URL(captured[0].url);
      expect(first.searchParams.get('availableFrom')).toBe('2026-09-20T00:00:00.000Z');
      expect(first.searchParams.get('availableTo')).toBe('2026-09-23T00:00:00.000Z');
      const second = new URL(captured[1].url);
      expect(second.searchParams.has('availableFrom')).toBe(false);
      expect(second.searchParams.has('availableTo')).toBe(false);
    });

    it('lanza FleetApiError cuando la respuesta no es ok', async () => {
      server.use(
        http.get(`${BASE_URL}/fleet/vehicles`, () =>
          new HttpResponse(null, { status: 403 }),
        ),
      );

      await expect(
        listVehicles('token-123', { companyId: 'comp-1', branchId: 'branch-1' }),
      ).rejects.toThrow(FleetApiError);
    });
  });

  describe('getVehicle', () => {
    it('retorna el vehículo cuando la respuesta es exitosa', async () => {
      const mockVehicle = { id: 'v-1', plate: 'ABC-123', brand: 'Toyota', model: 'Hilux', status: 'AVAILABLE' };

      server.use(
        http.get(`${BASE_URL}/fleet/vehicles/v-1`, () =>
          HttpResponse.json(mockVehicle),
        ),
      );

      const res = await getVehicle('token-123', 'v-1', 'comp-1', 'branch-1');
      expect(res).toEqual(mockVehicle);
    });
  });

  describe('createVehicle', () => {
    it('envía POST con payload y header de idempotencia', async () => {
      const mockVehicle = { id: 'v-1', plate: 'XYZ-789' };
      let capturedRequest: Request | undefined;

      server.use(
        http.post(`${BASE_URL}/fleet/vehicles`, async ({ request }) => {
          capturedRequest = request;
          return HttpResponse.json(mockVehicle);
        }),
      );

      const res = await createVehicle(
        'token-123',
        {
          companyId: 'comp-1', branchId: 'branch-1', plate: 'XYZ-789', brand: 'Hyundai', model: 'Tucson',
          depositMinimum: 500, passengerCapacity: 5, fuelPrice: 4.5, suitableForTrocha: false,
        },
        'key-abc',
      );

      expect(capturedRequest?.headers.get('Authorization')).toBe('Bearer token-123');
      expect(capturedRequest?.headers.get('Idempotency-Key')).toBe('key-abc');
      const body = await capturedRequest?.json();
      expect(body).toMatchObject({
        companyId: 'comp-1', branchId: 'branch-1', plate: 'XYZ-789',
        depositMinimum: 500, passengerCapacity: 5, fuelPrice: 4.5,
      });
      expect(res).toEqual(mockVehicle);
    });

    it('lanza FleetCommandError con detalle si el servidor responde con error', async () => {
      server.use(
        http.post(`${BASE_URL}/fleet/vehicles`, () =>
          HttpResponse.json(
            { code: 'VEHICLE_PLATE_ALREADY_EXISTS', detail: 'La placa ya existe' },
            { status: 409 },
          ),
        ),
      );

      await expect(
        createVehicle('token-123', {
          companyId: 'comp-1',
          branchId: 'branch-1',
          plate: 'XYZ-789',
          brand: 'Hyundai',
          model: 'Tucson',
          depositMinimum: 500,
          passengerCapacity: 5,
          fuelPrice: 4.5,
          suitableForTrocha: false,
        }),
      ).rejects.toThrow(FleetCommandError);
    });
  });

  describe('requestPhotoUploadSession', () => {
    it('envía POST con companyId, branchId, contentType y contentLength', async () => {
      const session = {
        uploadUrl: 'https://storage.googleapis.com/signed-url',
        objectUrl: 'https://storage.googleapis.com/bucket/photo.jpg',
      };
      let capturedBody: unknown;

      server.use(
        http.post(`${BASE_URL}/fleet/vehicles/photo-upload-sessions`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(session);
        }),
      );

      const result = await requestPhotoUploadSession('token-123', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        contentType: 'image/jpeg',
        contentLength: 500_000,
      });

      expect(capturedBody).toEqual({
        companyId: 'comp-1',
        branchId: 'branch-1',
        contentType: 'image/jpeg',
        contentLength: 500_000,
      });
      expect(result).toEqual(session);
    });

    it('lanza FleetCommandError cuando el servidor responde con error', async () => {
      server.use(
        http.post(`${BASE_URL}/fleet/vehicles/photo-upload-sessions`, () =>
          HttpResponse.json(
            { code: 'PAYLOAD_TOO_LARGE', detail: 'El archivo supera 12 MB' },
            { status: 413 },
          ),
        ),
      );

      await expect(
        requestPhotoUploadSession('token-123', {
          companyId: 'comp-1',
          branchId: 'branch-1',
          contentType: 'image/jpeg',
          contentLength: 13_000_000,
        }),
      ).rejects.toThrow(FleetCommandError);
    });
  });

  describe('uploadPhotoToGcs', () => {
    it('envía PUT al uploadUrl con el archivo como body', async () => {
      let capturedRequest: Request | undefined;

      server.use(
        http.put('https://storage.googleapis.com/signed', ({ request }) => {
          capturedRequest = request;
          return new HttpResponse(null, { status: 200 });
        }),
      );

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      await uploadPhotoToGcs('https://storage.googleapis.com/signed', file);

      expect(capturedRequest?.headers.get('Content-Type')).toBe('image/jpeg');
      expect(capturedRequest?.method).toBe('PUT');
    });

    it('lanza GcsUploadError cuando GCS responde con error', async () => {
      server.use(
        http.put('https://storage.googleapis.com/signed-err', () =>
          new HttpResponse(null, { status: 403 }),
        ),
      );

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      await expect(
        uploadPhotoToGcs('https://storage.googleapis.com/signed-err', file),
      ).rejects.toThrow(GcsUploadError);
    });

    it('GcsUploadError incluye el status HTTP de GCS', async () => {
      server.use(
        http.put('https://storage.googleapis.com/signed-503', () =>
          new HttpResponse(null, { status: 503 }),
        ),
      );

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      try {
        await uploadPhotoToGcs('https://storage.googleapis.com/signed-503', file);
      } catch (e) {
        expect(e).toBeInstanceOf(GcsUploadError);
        expect((e as GcsUploadError).status).toBe(503);
      }
    });
  });

  describe('updateVehicleStatus', () => {
    it('envía PATCH con nuevo estado del vehículo', async () => {
      const updated = { id: 'v-1', status: 'MAINTENANCE' };
      let capturedRequest: Request | undefined;

      server.use(
        http.patch(`${BASE_URL}/fleet/vehicles/v-1/status`, async ({ request }) => {
          capturedRequest = request;
          return HttpResponse.json(updated);
        }),
      );

      const res = await updateVehicleStatus('token-123', 'v-1', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        status: 'MAINTENANCE',
      });

      expect(capturedRequest?.headers.get('Authorization')).toBe('Bearer token-123');
      const body = await capturedRequest?.json();
      expect(body).toMatchObject({ companyId: 'comp-1', branchId: 'branch-1', status: 'MAINTENANCE' });
      expect(res).toEqual(updated);
    });
  });

  describe('updateVehicle', () => {
    it('envía PATCH al endpoint del vehículo con los campos de edición', async () => {
      const updated = { id: 'v-1', brand: 'Toyota', model: 'Fortuner' };
      let capturedRequest: Request | undefined;

      server.use(
        http.patch(`${BASE_URL}/fleet/vehicles/v-1`, async ({ request }) => {
          capturedRequest = request;
          return HttpResponse.json(updated);
        }),
      );

      const { updateVehicle } = await import('./fleet-client');
      const res = await updateVehicle('token-123', 'v-1', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        brand: 'Toyota',
        model: 'Fortuner',
      });

      expect(capturedRequest?.headers.get('Authorization')).toBe('Bearer token-123');
      const body = await capturedRequest?.json();
      expect(body).toMatchObject({ companyId: 'comp-1', branchId: 'branch-1', brand: 'Toyota', model: 'Fortuner' });
      expect(res).toEqual(updated);
    });
  });
});
