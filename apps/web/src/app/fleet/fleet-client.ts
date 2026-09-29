const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export type VehicleStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

export interface FleetVehicle {
  id: string;
  organizationId: string;
  operatingCompanyId: string;
  branchId: string | null;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  category: string;
  status: VehicleStatus;
  dailyRate: number | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehiclePayload {
  companyId: string;
  branchId: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  category?: string;
  status?: VehicleStatus;
  dailyRate?: number;
  photoUrl?: string;
}

export interface UpdateVehicleStatusPayload {
  companyId: string;
  branchId: string;
  status: VehicleStatus;
}

export interface UpdateVehiclePayload {
  companyId: string;
  branchId: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  category?: string;
  dailyRate?: number;
  photoUrl?: string;
}

export interface ListVehiclesParams {
  companyId: string;
  branchId: string;
  filterBranchId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListVehiclesResult {
  items: FleetVehicle[];
  total: number;
}

function authHeaders(idToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
}

export class FleetApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FleetApiError';
    this.status = status;
  }
}

export class FleetCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operación no se pudo completar (${status})`);
    this.name = 'FleetCommandError';
  }
}

export async function listVehicles(
  idToken: string,
  params: ListVehiclesParams,
  signal?: AbortSignal,
): Promise<ListVehiclesResult> {
  const query = new URLSearchParams({
    companyId: params.companyId,
    branchId: params.branchId,
  });
  if (params.filterBranchId) query.set('filterBranchId', params.filterBranchId);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));

  const response = await fetch(`${API_BASE_URL}/fleet/vehicles?${query.toString()}`, {
    headers: authHeaders(idToken),
    signal,
  });

  if (!response.ok) {
    throw new FleetApiError(
      `No se pudo obtener el catálogo de vehículos (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as ListVehiclesResult;
}

export async function getVehicle(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<FleetVehicle> {
  const query = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/fleet/vehicles/${id}?${query.toString()}`, {
    headers: authHeaders(idToken),
  });

  if (!response.ok) {
    throw new FleetApiError(
      `No se pudo obtener el detalle del vehículo (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as FleetVehicle;
}

export async function createVehicle(
  idToken: string,
  payload: CreateVehiclePayload,
  idempotencyKey?: string,
): Promise<FleetVehicle> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}/fleet/vehicles`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: { code?: string; detail?: string } | null = null;
    try {
      problem = await response.json();
    } catch {
      // response might not be JSON
    }
    throw new FleetCommandError(response.status, problem);
  }

  return (await response.json()) as FleetVehicle;
}

export async function updateVehicleStatus(
  idToken: string,
  id: string,
  payload: UpdateVehicleStatusPayload,
): Promise<FleetVehicle> {
  const response = await fetch(`${API_BASE_URL}/fleet/vehicles/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(idToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: { code?: string; detail?: string } | null = null;
    try {
      problem = await response.json();
    } catch {
      // response might not be JSON
    }
    throw new FleetCommandError(response.status, problem);
  }

  return (await response.json()) as FleetVehicle;
}

export async function updateVehicle(
  idToken: string,
  id: string,
  payload: UpdateVehiclePayload,
): Promise<FleetVehicle> {
  const response = await fetch(`${API_BASE_URL}/fleet/vehicles/${id}`, {
    method: 'PATCH',
    headers: authHeaders(idToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: { code?: string; detail?: string } | null = null;
    try {
      problem = await response.json();
    } catch {
      // response might not be JSON
    }
    throw new FleetCommandError(response.status, problem);
  }

  return (await response.json()) as FleetVehicle;
}
