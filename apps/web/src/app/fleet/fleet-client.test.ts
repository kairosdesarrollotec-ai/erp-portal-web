import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('fleet-client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listVehicles', () => {
    it('envía los parámetros de consulta correctos con Bearer token', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });

      const result = await listVehicles('token-123', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        status: 'AVAILABLE',
        search: 'Hilux',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/fleet/vehicles?companyId=comp-1&branchId=branch-1&status=AVAILABLE&search=Hilux'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer token-123',
            'Content-Type': 'application/json',
          },
        }),
      );
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('lanza FleetApiError cuando la respuesta no es ok', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(
        listVehicles('token-123', { companyId: 'comp-1', branchId: 'branch-1' }),
      ).rejects.toThrow(FleetApiError);
    });
  });

  describe('getVehicle', () => {
    it('retorna el vehículo cuando la respuesta es exitosa', async () => {
      const mockVehicle = {
        id: 'v-1',
        plate: 'ABC-123',
        brand: 'Toyota',
        model: 'Hilux',
        status: 'AVAILABLE',
      };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVehicle,
      });

      const res = await getVehicle('token-123', 'v-1', 'comp-1', 'branch-1');
      expect(res).toEqual(mockVehicle);
    });
  });

  describe('createVehicle', () => {
    it('envía POST con payload y header de idempotencia opcional', async () => {
      const mockVehicle = { id: 'v-1', plate: 'XYZ-789' };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVehicle,
      });

      const res = await createVehicle(
        'token-123',
        {
          companyId: 'comp-1',
          branchId: 'branch-1',
          plate: 'XYZ-789',
          brand: 'Hyundai',
          model: 'Tucson',
        },
        'key-abc',
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/fleet/vehicles'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer token-123',
            'Content-Type': 'application/json',
            'Idempotency-Key': 'key-abc',
          },
          body: JSON.stringify({
            companyId: 'comp-1',
            branchId: 'branch-1',
            plate: 'XYZ-789',
            brand: 'Hyundai',
            model: 'Tucson',
          }),
        }),
      );
      expect(res).toEqual(mockVehicle);
    });

    it('lanza FleetCommandError con detalle si el servidor responde con error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ code: 'VEHICLE_PLATE_ALREADY_EXISTS', detail: 'La placa ya existe' }),
      });

      await expect(
        createVehicle('token-123', {
          companyId: 'comp-1',
          branchId: 'branch-1',
          plate: 'XYZ-789',
          brand: 'Hyundai',
          model: 'Tucson',
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
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => session });

      const result = await requestPhotoUploadSession('token-123', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        contentType: 'image/jpeg',
        contentLength: 500_000,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/fleet/vehicles/photo-upload-sessions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
          body: JSON.stringify({
            companyId: 'comp-1',
            branchId: 'branch-1',
            contentType: 'image/jpeg',
            contentLength: 500_000,
          }),
        }),
      );
      expect(result).toEqual(session);
    });

    it('lanza FleetCommandError cuando el servidor responde con error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: async () => ({ code: 'PAYLOAD_TOO_LARGE', detail: 'El archivo supera 12 MB' }),
      });

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
      fetchMock.mockResolvedValueOnce({ ok: true });
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

      await uploadPhotoToGcs('https://storage.googleapis.com/signed', file);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://storage.googleapis.com/signed',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: file,
        }),
      );
    });

    it('lanza GcsUploadError cuando GCS responde con error', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

      await expect(
        uploadPhotoToGcs('https://storage.googleapis.com/signed', file),
      ).rejects.toThrow(GcsUploadError);
    });

    it('GcsUploadError incluye el status HTTP de GCS', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

      try {
        await uploadPhotoToGcs('https://storage.googleapis.com/signed', file);
      } catch (e) {
        expect(e).toBeInstanceOf(GcsUploadError);
        expect((e as GcsUploadError).status).toBe(503);
      }
    });
  });

  describe('updateVehicleStatus', () => {
    it('envía PATCH con nuevo estado del vehículo', async () => {
      const updated = { id: 'v-1', status: 'MAINTENANCE' };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => updated,
      });

      const res = await updateVehicleStatus('token-123', 'v-1', {
        companyId: 'comp-1',
        branchId: 'branch-1',
        status: 'MAINTENANCE',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/fleet/vehicles/v-1/status'),
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer token-123',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId: 'comp-1',
            branchId: 'branch-1',
            status: 'MAINTENANCE',
          }),
        }),
      );
      expect(res).toEqual(updated);
    });
  });
});
