import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicleStatus,
  FleetApiError,
  FleetCommandError,
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
            'X-Idempotency-Key': 'key-abc',
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
