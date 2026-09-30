import type { components } from '../../api/fleet.generated';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export type VehicleStatus = components['schemas']['VehicleStatus'];
export type FleetVehicle = components['schemas']['VehicleResponse'];
export type CreateVehiclePayload = components['schemas']['CreateVehicleRequest'];
export type UpdateVehiclePayload = components['schemas']['UpdateVehicleRequest'];
export type UpdateVehicleStatusPayload = components['schemas']['UpdateVehicleStatusRequest'];
export type ListVehiclesResponse = components['schemas']['ListVehiclesResponse'];
export type KairosErrorResponse = components['schemas']['KairosErrorResponse'];
export type PhotoUploadSessionRequest = components['schemas']['PhotoUploadSessionRequest'];
export type PhotoUploadSessionResponse = components['schemas']['PhotoUploadSessionResponse'];

export interface ListVehiclesParams {
  companyId: string;
  branchId: string;
  filterBranchId?: string;
  status?: VehicleStatus;
  search?: string;
  limit?: number;
  offset?: number;
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

export class GcsUploadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GcsUploadError';
    this.status = status;
  }
}

export class FleetCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: KairosErrorResponse | null,
  ) {
    super(problem?.detail ?? `La operación no se pudo completar (${status})`);
    this.name = 'FleetCommandError';
  }
}

export async function listVehicles(
  idToken: string,
  params: ListVehiclesParams,
  signal?: AbortSignal,
): Promise<ListVehiclesResponse> {
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

  return (await response.json()) as ListVehiclesResponse;
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
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}/fleet/vehicles`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: KairosErrorResponse | null = null;
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
  idempotencyKey?: string,
): Promise<FleetVehicle> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}/fleet/vehicles/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: KairosErrorResponse | null = null;
    try {
      problem = await response.json();
    } catch {
      // response might not be JSON
    }
    throw new FleetCommandError(response.status, problem);
  }

  return (await response.json()) as FleetVehicle;
}

export async function requestPhotoUploadSession(
  idToken: string,
  payload: PhotoUploadSessionRequest,
): Promise<PhotoUploadSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/fleet/vehicles/photo-upload-sessions`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: KairosErrorResponse | null = null;
    try {
      problem = await response.json();
    } catch {
      // response might not be JSON
    }
    throw new FleetCommandError(response.status, problem);
  }

  return (await response.json()) as PhotoUploadSessionResponse;
}

export async function uploadPhotoToGcs(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!response.ok) {
    throw new GcsUploadError(`Error al subir la foto a GCS (${response.status})`, response.status);
  }
}

export async function updateVehicle(
  idToken: string,
  id: string,
  payload: UpdateVehiclePayload,
  idempotencyKey?: string,
): Promise<FleetVehicle> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}/fleet/vehicles/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: KairosErrorResponse | null = null;
    try {
      problem = await response.json();
    } catch {
      // response might not be JSON
    }
    throw new FleetCommandError(response.status, problem);
  }

  return (await response.json()) as FleetVehicle;
}
