import type { components, operations } from '../../api/fleet.generated';
import { fleetApiClient } from '../../api/fleet-api-client';

export type VehicleStatus = components['schemas']['VehicleStatus'];
export type FleetVehicle = components['schemas']['VehicleResponse'];
export type CreateVehiclePayload = components['schemas']['CreateVehicleRequest'];
export type UpdateVehiclePayload = components['schemas']['UpdateVehicleRequest'];
export type UpdateVehicleStatusPayload = components['schemas']['UpdateVehicleStatusRequest'];
export type VehicleAvailability = components['schemas']['VehicleAvailability'];
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
  /** ISO date-time. Ambos o ninguno: con ellos cada vehiculo trae `availability`. */
  availableFrom?: string;
  availableTo?: string;
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
  const { data, error, response } = await fleetApiClient.GET('/fleet/vehicles', {
    params: {
      query: {
        companyId: params.companyId,
        branchId: params.branchId,
        ...(params.filterBranchId ? { filterBranchId: params.filterBranchId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { search: params.search } : {}),
        ...(params.limit !== undefined ? { limit: params.limit } : {}),
        ...(params.offset !== undefined ? { offset: params.offset } : {}),
        ...(params.availableFrom && params.availableTo
          ? { availableFrom: params.availableFrom, availableTo: params.availableTo }
          : {}),
      },
    },
    headers: { Authorization: `Bearer ${idToken}` },
    signal,
  });
  if (error || !data) {
    throw new FleetApiError(
      `No se pudo obtener el catálogo de vehículos (${response.status})`,
      response.status,
    );
  }
  return data;
}

export async function getVehicle(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<FleetVehicle> {
  const { data, error, response } = await fleetApiClient.GET('/fleet/vehicles/{id}', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new FleetApiError(
      `No se pudo obtener el detalle del vehículo (${response.status})`,
      500,
    );
  }
  return data;
}

export async function createVehicle(
  idToken: string,
  payload: CreateVehiclePayload,
  idempotencyKey?: string,
): Promise<FleetVehicle> {
  const { data, error } = await fleetApiClient.POST('/fleet/vehicles', {
    params: {
      header: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: payload,
  });
  if (error || !data) {
    throw new FleetCommandError(
      500,
      (error as unknown as KairosErrorResponse | null) ?? null,
    );
  }
  return data;
}

export async function updateVehicleStatus(
  idToken: string,
  id: string,
  payload: UpdateVehicleStatusPayload,
  idempotencyKey?: string,
): Promise<FleetVehicle> {
  const { data, error, response } = await fleetApiClient.PATCH('/fleet/vehicles/{id}/status', {
    params: {
      path: { id },
      header: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: payload,
  });
  if (error || !data) {
    throw new FleetCommandError(
      response.status,
      (error as unknown as KairosErrorResponse | null) ?? null,
    );
  }
  return data;
}

export async function requestPhotoUploadSession(
  idToken: string,
  payload: PhotoUploadSessionRequest,
): Promise<PhotoUploadSessionResponse> {
  const { data, error, response } = await fleetApiClient.POST('/fleet/vehicles/photo-upload-sessions', {
    headers: { Authorization: `Bearer ${idToken}` },
    body: payload,
  });
  if (error || !data) {
    throw new FleetCommandError(
      response.status,
      (error as unknown as KairosErrorResponse | null) ?? null,
    );
  }
  return data;
}

/**
 * Sube el archivo directamente a GCS (no al API KAIROS).
 * Se mantiene como fetch manual: la URL es de GCS, no del API,
 * y no existe un contrato OpenAPI para este destino externo.
 */
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
  const { data, error, response } = await fleetApiClient.PATCH('/fleet/vehicles/{id}', {
    params: {
      path: { id },
      header: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: payload,
  });
  if (error || !data) {
    throw new FleetCommandError(
      response.status,
      (error as unknown as KairosErrorResponse | null) ?? null,
    );
  }
  return data;
}

export type RecordVehicleOperationalFormatInput =
  operations['recordVehicleOperationalFormat']['requestBody']['content']['application/json'];
export type VehicleOperationalRecordList =
  operations['listVehicleOperationalRecords']['responses'][200]['content']['application/json'];
export type VehicleOperationalReminderList =
  operations['listVehicleOperationalReminders']['responses'][200]['content']['application/json'];
type VehicleOperationalRecordsQuery = NonNullable<operations['listVehicleOperationalRecords']['parameters']['query']>;
type VehicleOperationalRemindersQuery = operations['listVehicleOperationalReminders']['parameters']['query'];

export async function recordVehicleOperationalFormat(
  idToken: string,
  vehicleId: string,
  payload: RecordVehicleOperationalFormatInput,
  idempotencyKey?: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await fleetApiClient.POST('/fleet/vehicles/{id}/operational-records', {
    params: {
      path: { id: vehicleId },
      header: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: payload,
  });
  if (error || !data) {
    throw new FleetCommandError(
      500,
      (error as unknown as KairosErrorResponse | null) ?? null,
    );
  }
  return data;
}

export async function listVehicleOperationalRecords(
  idToken: string,
  vehicleId: string,
  params: VehicleOperationalRecordsQuery,
): Promise<VehicleOperationalRecordList> {
  const { data, error } = await fleetApiClient.GET('/fleet/vehicles/{id}/operational-records', {
    params: {
      path: { id: vehicleId },
      query: params,
    },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    const status = 500;
    throw new FleetApiError(
      `No se pudieron cargar los registros operativos (${status})`,
      status,
    );
  }
  return data;
}

export async function listVehicleOperationalReminders(
  idToken: string,
  params: VehicleOperationalRemindersQuery,
): Promise<VehicleOperationalReminderList> {
  const { data, error } = await fleetApiClient.GET('/fleet/operational-reminders', {
    params: {
      query: params,
    },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    const status = 500;
    throw new FleetApiError(
      `No se pudieron cargar los recordatorios (${status})`,
      status,
    );
  }
  return data;
}
