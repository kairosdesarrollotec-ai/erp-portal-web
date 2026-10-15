import type { ChannelMode, ReservationStatus } from './reservation-status';
import { reservationsApiClient } from '../../api/reservations-api-client';

/** Error HTTP de lectura (GET) — expone el status para distinguir 401/403/404/5xx (TDD-RES-001.md finding #7). */
export class ReservationApiError extends Error {
  readonly name = 'ReservationApiError';
  constructor(public readonly status: number) {
    super(`Error HTTP ${status} al consultar reservas`);
  }
}

export interface ReservationSummary {
  id: string;
  status: ReservationStatus;
  channelMode: ChannelMode;
  version: number;
  customer: { id: string; name: string };
  vehicle: { id: string; plate: string; label: string };
  startAt: string;
  endAt: string;
  requiredPayment: { amount: string; currency: string };
  requirements: { paymentValidatedAt: string | null; documentsCompletedAt: string | null };
  missingRequirements: string[];
  confirmedAt: string | null;
  createdAt: string;
  /** RES-08: ya llegó la fecha pactada (now >= startAt). Solo en GET /reservations/{id}. */
  startDatePassed?: boolean;
  /** RES-07: última resolución por venta del vehículo. Solo en GET /reservations/{id}; los comandos NO la traen. */
  saleResolution?: SaleResolution | null;
}

export interface SaleResolution {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  reason: string;
  offeredVehicle: { id: string; plate: string; label: string } | null;
  offerNote: string | null;
  flaggedAt: string;
  alternativeVehicleId: string | null;
  refundStatus: 'PENDING_TRANSFER' | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
}

/** Cuerpo `problem+json` que el backend devuelve en 409/422 (TDD-RES-001.md 11.4). */
export class ReservationCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string; missingRequirements?: string[] } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }

  /** 412 / RESERVATION_VERSION_CONFLICT: la reserva cambió (If-Match) y hay que recargarla. */
  get isVersionConflict(): boolean {
    return this.status === 412 || this.problem?.code === 'RESERVATION_VERSION_CONFLICT';
  }

  /** 409 / VEHICLE_NOT_AVAILABLE: el vehículo ya está ocupado para las fechas de la reserva. */
  get isVehicleUnavailable(): boolean {
    return this.problem?.code === 'VEHICLE_NOT_AVAILABLE';
  }
}

export const VEHICLE_NOT_AVAILABLE_MESSAGE =
  'Este vehículo ya está ocupado para estas fechas. Elige otro vehículo u otras fechas.';

/** RES-01 - bandeja de reservas (TDD-RES-001.md 11, GET /reservations). */
export async function listReservations(
  idToken: string,
  companyId: string,
  branchId: string,
  status?: ReservationStatus,
): Promise<ReservationSummary[]> {
  const { data, error, response } = await reservationsApiClient.GET('/reservations', {
    params: {
      query: {
        companyId,
        branchId,
        ...(status ? { status } : {}),
      },
    },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) throw new ReservationApiError(response.status);
  return data as unknown as ReservationSummary[];
}

/** RES-04/RES-05 - detalle de una reserva. */
export async function getReservation(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<ReservationSummary> {
  const { data, error, response } = await reservationsApiClient.GET('/reservations/{id}', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) throw new ReservationApiError(response.status);
  return data as unknown as ReservationSummary;
}

export function registerPayment(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
): Promise<ReservationSummary> {
  return reservationsApiClient
    .POST('/reservations/{id}/commands/register-payment', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
      body: { companyId, branchId },
    })
    .then(({ data, error, response }) => {
      if (error || !data) {
        const problem = (error as unknown as { code?: string; detail?: string; missingRequirements?: string[] } | null) ?? null;
        throw new ReservationCommandError(response.status, problem);
      }
      return data as unknown as ReservationSummary;
    });
}

export function registerDocuments(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
): Promise<ReservationSummary> {
  return reservationsApiClient
    .POST('/reservations/{id}/commands/register-documents', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
      body: { companyId, branchId },
    })
    .then(({ data, error, response }) => {
      if (error || !data) {
        const problem = (error as unknown as { code?: string; detail?: string; missingRequirements?: string[] } | null) ?? null;
        throw new ReservationCommandError(response.status, problem);
      }
      return data as unknown as ReservationSummary;
    });
}

export function confirmReservation(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
): Promise<ReservationSummary> {
  return reservationsApiClient
    .POST('/reservations/{id}/commands/confirm', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
      body: { companyId, branchId },
    })
    .then(({ data, error, response }) => {
      if (error || !data) {
        const problem = (error as unknown as { code?: string; detail?: string; missingRequirements?: string[] } | null) ?? null;
        throw new ReservationCommandError(response.status, problem);
      }
      return data as unknown as ReservationSummary;
    });
}

export function cancelReservation(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  reason: 'CUSTOMER_REQUESTED_CHANGE' | 'NO_SHOW',
  note?: string,
): Promise<ReservationSummary> {
  return reservationsApiClient
    .POST('/reservations/{id}/commands/cancel', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
      body: { companyId, branchId, reason, note } as { companyId: string; branchId: string; reason: 'CUSTOMER_REQUESTED_CHANGE' | 'NO_SHOW'; note?: string },
    })
    .then(({ data, error, response }) => {
      if (error || !data) {
        const problem = (error as unknown as { code?: string; detail?: string; missingRequirements?: string[] } | null) ?? null;
        throw new ReservationCommandError(response.status, problem);
      }
      return data as unknown as ReservationSummary;
    });
}

export type ReservationDocumentType = 'PAYMENT_VOUCHER' | 'ID_DOCUMENT' | 'OTHER';
export type ReservationDocumentContentType = 'image/jpeg' | 'image/webp' | 'image/png' | 'application/pdf';

export interface ReservationDocumentRecord {
  id: string;
  reservationId: string;
  documentType: ReservationDocumentType;
  objectUrl: string;
  createdAt: string;
}

export class GcsDocumentUploadError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function requestReservationDocumentUploadSession(
  idToken: string,
  reservationId: string,
  companyId: string,
  branchId: string,
  documentType: ReservationDocumentType,
  contentType: ReservationDocumentContentType,
  contentLength: number,
): Promise<{ uploadUrl: string; objectUrl: string }> {
  const { data, error, response } = await reservationsApiClient.POST('/reservations/{id}/documents/upload-url', {
    params: { path: { id: reservationId } },
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, documentType, contentType, contentLength } as never,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new ReservationCommandError(response.status, problem);
  }
  return data as unknown as { uploadUrl: string; objectUrl: string };
}

export async function uploadReservationFileToGcs(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new GcsDocumentUploadError(`Error al subir el archivo a GCS (${res.status})`, res.status);
  }
}

export async function recordReservationDocument(
  idToken: string,
  reservationId: string,
  companyId: string,
  branchId: string,
  documentType: ReservationDocumentType,
  objectUrl: string,
): Promise<ReservationDocumentRecord> {
  const { data, error, response } = await reservationsApiClient.POST('/reservations/{id}/documents', {
    params: { path: { id: reservationId } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, documentType, objectUrl } as never,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new ReservationCommandError(response.status, problem);
  }
  return data as unknown as ReservationDocumentRecord;
}

/** Mensajes en español por código de error de negocio de RES-06/07/08 (se usa el `detail` del back si viene). */
export const RESERVATION_ERROR_MESSAGES: Record<string, string> = {
  ROLE_NOT_ALLOWED: 'Tu rol no tiene permiso para realizar esta acción.',
  RESERVATION_STATE_CONFLICT: 'La reserva ya no está en un estado que permita esta acción. Recarga para ver su estado actual.',
  VEHICLE_NOT_AVAILABLE: VEHICLE_NOT_AVAILABLE_MESSAGE,
  SALE_RESOLUTION_ALREADY_OPEN: 'Esta reserva ya tiene una venta pendiente de resolver.',
  ALTERNATIVE_VEHICLE_INVALID: 'El vehículo alternativo no es válido (mismo vehículo, otra sede o no está disponible). Elige otro.',
  ALTERNATIVE_VEHICLE_REQUIRED: 'Elige un vehículo alternativo para aceptar la oferta.',
  RESERVATION_VERSION_CONFLICT: 'La reserva cambió mientras trabajabas. Recarga para ver la versión actual.',
  IF_MATCH_REQUIRED: 'No se pudo verificar la versión de la reserva. Recarga e intenta de nuevo.',
};

export function describeReservationError(error: ReservationCommandError): string {
  return (
    error.problem?.detail?.trim() ||
    (error.problem?.code ? RESERVATION_ERROR_MESSAGES[error.problem.code] : undefined) ||
    'No se pudo completar la operación. Intenta de nuevo.'
  );
}

function commandError(
  version: number,
  error: unknown,
  status: number,
): never {
  if (version == null) {
    throw new ReservationCommandError(428, { code: 'IF_MATCH_REQUIRED', detail: 'Versión de reserva no disponible. Recarga e intenta de nuevo.' });
  }
  throw new ReservationCommandError(status, (error as { code?: string; detail?: string } | null) ?? null);
}

/** RES-07 - Gerencia/Administración registra la venta del vehículo reservado (CONFIRMED -> PENDING_SALE_RESOLUTION). */
export function flagVehicleSale(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  opts: { alternativeVehicleId?: string; note?: string } = {},
  idempotencyKey = crypto.randomUUID(),
): Promise<ReservationSummary> {
  if (version == null) {
    throw new ReservationCommandError(428, { code: 'IF_MATCH_REQUIRED', detail: 'Versión de reserva no disponible. Recarga e intenta de nuevo.' });
  }
  return reservationsApiClient
    .POST('/reservations/{id}/commands/flag-sale', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': idempotencyKey },
      body: { companyId, branchId, alternativeVehicleId: opts.alternativeVehicleId, note: opts.note },
    })
    .then(({ data, error, response }) => {
      if (error || !data) commandError(version, error, response.status);
      return data as unknown as ReservationSummary;
    });
}

/**
 * RES-06 - cambia el vehículo de una reserva en borrador (POST .../commands/change-vehicle).
 * Limpia documentsCompletedAt y conserva el pago. Errores: 409 RESERVATION_STATE_CONFLICT / VEHICLE_NOT_AVAILABLE,
 * 412 RESERVATION_VERSION_CONFLICT, 422 ALTERNATIVE_VEHICLE_INVALID, 428 IF_MATCH_REQUIRED, 403 ROLE_NOT_ALLOWED.
 */
export function changeReservationVehicle(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  vehicleId: string,
  idempotencyKey = crypto.randomUUID(),
): Promise<ReservationSummary> {
  if (version == null) {
    throw new ReservationCommandError(428, { code: 'IF_MATCH_REQUIRED', detail: 'Versión de reserva no disponible. Recarga e intenta de nuevo.' });
  }
  return reservationsApiClient
    .POST('/reservations/{id}/commands/change-vehicle', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': idempotencyKey },
      body: { companyId, branchId, vehicleId },
    })
    .then(({ data, error, response }) => {
      if (error || !data) commandError(version, error, response.status);
      return data as unknown as ReservationSummary;
    });
}

/** RES-07 - resolución de la venta: ACCEPT_ALTERNATIVE (vuelve a DRAFT) o REJECT (CANCELLED + reembolso pendiente). */
export function resolveVehicleSale(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  decision: 'ACCEPT_ALTERNATIVE' | 'REJECT',
  opts: { alternativeVehicleId?: string; note?: string } = {},
  idempotencyKey = crypto.randomUUID(),
): Promise<ReservationSummary> {
  if (version == null) {
    throw new ReservationCommandError(428, { code: 'IF_MATCH_REQUIRED', detail: 'Versión de reserva no disponible. Recarga e intenta de nuevo.' });
  }
  return reservationsApiClient
    .POST('/reservations/{id}/commands/resolve-sale', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': idempotencyKey },
      body: { companyId, branchId, decision, alternativeVehicleId: opts.alternativeVehicleId, note: opts.note },
    })
    .then(({ data, error, response }) => {
      if (error || !data) commandError(version, error, response.status);
      return data as unknown as ReservationSummary;
    });
}
