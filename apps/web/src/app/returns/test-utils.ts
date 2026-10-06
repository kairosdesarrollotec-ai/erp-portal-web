import { vi } from 'vitest';
import type { ReturnResponse } from './returns-client';

/** Fixtures compartidos por las pruebas del modulo Devolucion (no se importa desde codigo de produccion). */
export const baseContext = {
  companyId: 'c1',
  companyName: 'VeloxRent',
  branchId: 'b1',
  branchName: 'Sede Central',
};

export function makeReturn(overrides: Partial<ReturnResponse> = {}): ReturnResponse {
  return {
    id: 'ret-1',
    organizationId: 'org-1',
    operatingCompanyId: 'c1',
    branchId: 'b1',
    rentalId: 'rent-1',
    vehicleId: 'veh-1',
    customerId: 'cust-1',
    vehiclePlate: 'D0Y-704',
    customerName: 'Maria Quispe',
    status: 'RECEPCION_PROVISIONAL',
    custodyHolder: 'VELOXRENT',
    customerPresent: true,
    mileageAtReturn: 12000,
    fuelLevelAtReturn: 'HALF',
    alcoholTestResult: null,
    scheduledAt: '2026-10-04T10:00:00Z',
    receivedAt: '2026-10-04T10:05:00Z',
    inspectedAt: null,
    closedAt: null,
    finalSettlementAmount: null,
    createdAt: '2026-10-04T09:00:00Z',
    createdBy: 'uid-1',
    updatedAt: '2026-10-04T10:05:00Z',
    updatedBy: 'uid-1',
    version: 2,
    etag: '"2"',
    alcoholEscalation: null,
    responsibilityDocument: null,
    damages: [],
    immobilizationCharges: [],
    ...overrides,
  };
}

export function makeFlow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ret-1',
    state: 'READY' as const,
    ret: makeReturn(),
    context: baseContext,
    getIdToken: vi.fn().mockResolvedValue('tok'),
    setRet: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function problem(status: number, code?: string, detail?: string) {
  return { ok: false, status, json: async () => ({ code, detail }) };
}
