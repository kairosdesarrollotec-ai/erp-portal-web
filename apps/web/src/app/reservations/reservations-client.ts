import type { ChannelMode, ReservationStatus } from './reservation-status';
import { reservationsApiClient } from '../../api/reservations-api-client';
import type { ReservationPaymentBody } from '../shared/payment-proof';

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
  canComeToOffice?: boolean | null;
  customerLocation?: 'AYACUCHO' | 'FUERA_DE_AYACUCHO' | null;
  version: number;
  customer: { id: string; name: string };
  vehicle: { id: string; plate: string; label: string };
  /** reservations.yaml 0.9.0 (DEC-ALQ-VEHDATA-001): un aviso por dato faltante del vehículo (capacidad, garantía, combustible). No bloquea. */
  vehicleWarnings?: { code: string; field?: string; message?: string }[];
  startAt: string;
  endAt: string;
  requiredPayment: { amount: string; currency: string };
  requirements: {
    paymentValidatedAt: string | null;
    documentsCompletedAt: string | null;
    isRemote?: boolean;
    video360Uploaded?: boolean;
    signedAcceptanceUploaded?: boolean;
  };
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
  refundStatus: 'PENDING_TRANSFER' | 'TRANSFERRED' | null;
  transferVoucher?: string | null;
  transferredAt?: string | null;
  transferredBy?: string | null;
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

/**
 * Decision 22-oct (#8): el pago de la reserva se verifica con el comprobante. Ademas del scope se envian
 * monto pagado, metodo, nº de operacion, pagador y `voucherDocumentId` (`payment`). El comprobante ya fue subido y
 * registrado como documento PAYMENT_VOUCHER antes de llamar a este comando. El monto REQUERIDO y la version de politica
 * los lee el backend (no se envian); `amount` es lo realmente pagado (menor -> 422 INVALID_DEPOSIT_AMOUNT).
 */
export function registerPayment(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  payment?: ReservationPaymentBody,
): Promise<ReservationSummary> {
  if (!payment) return Promise.reject(new ReservationCommandError(422, { code: 'PAYMENT_REQUIRED', detail: 'Completa los datos del pago antes de registrarlo.' }));
  return reservationsApiClient
    .POST('/reservations/{id}/commands/register-payment', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
      body: { companyId, branchId, ...payment },
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

export type ReservationDocumentType = 'PAYMENT_VOUCHER' | 'ID_DOCUMENT' | 'VIDEO_360' | 'SIGNED_ACCEPTANCE' | 'OTHER';
export type ReservationDocumentContentType =
  | 'image/jpeg'
  | 'image/webp'
  | 'image/png'
  | 'application/pdf'
  | 'video/mp4'
  | 'video/webm';

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
  INVALID_CANCEL_REASON:
    'Motivo de cancelación no válido: solo se permite cambio solicitado por el cliente o no presentación. La venta del vehículo se resuelve desde "Registrar venta".',
  IF_MATCH_REQUIRED: 'No se pudo verificar la versión de la reserva. Recarga e intenta de nuevo.',
  RESERVATION_EXCEEDS_GUARANTEE:
    'El monto de la reserva no puede superar la garantía del vehículo. No existe saldo a favor: elige otro vehículo o revisa la política de reserva.',
  INVALID_DEPOSIT_AMOUNT: 'El monto del pago no es válido. Revisa el monto de la reserva e inténtalo de nuevo.',
  RESERVATION_START_NOT_REACHED:
    'Todavía no llegó la fecha pactada de la reserva: solo se puede continuar con el alquiler el día pactado.',
  RESERVATION_START_DATE_PASSED:
    'La fecha pactada de la reserva ya pasó. Aplica el protocolo de no-show.',
  INQUIRY_CONVERSION_REQUIRED:
    'La reserva solo se crea desde una Consulta (botón "Reservar este vehículo" en su detalle).',
  RESERVATION_REQUIREMENTS_NOT_MET:
    'Para confirmar una reserva remota se requiere el video 360° del vehículo y el documento de aceptación firmado (BR-RES-005, SC-RES-007).',
};

/** Codigos cuyo mensaje de negocio (decisiones 22-oct) prevalece sobre el `detail` tecnico del backend. */
const PREFERRED_MESSAGE_CODES = new Set([
  'RESERVATION_EXCEEDS_GUARANTEE',
  'INVALID_DEPOSIT_AMOUNT',
  'RESERVATION_START_NOT_REACHED',
  'RESERVATION_START_DATE_PASSED',
  'INQUIRY_CONVERSION_REQUIRED',
  'RESERVATION_REQUIREMENTS_NOT_MET',
]);

export function describeReservationError(error: ReservationCommandError): string {
  const code = error.problem?.code;
  if (code && PREFERRED_MESSAGE_CODES.has(code)) return RESERVATION_ERROR_MESSAGES[code];
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

/** C4 - Confirmar transferencia de reembolso por venta del vehículo rechazado (POST .../commands/confirm-sale-refund-transfer). */
export function confirmSaleRefundTransfer(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  transferVoucher: string,
  transferredAt?: string,
  idempotencyKey = crypto.randomUUID(),
): Promise<ReservationSummary> {
  if (version == null) {
    throw new ReservationCommandError(428, { code: 'IF_MATCH_REQUIRED', detail: 'Versión de reserva no disponible. Recarga e intenta de nuevo.' });
  }
  return reservationsApiClient
    .POST('/reservations/{id}/commands/confirm-sale-refund-transfer', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': idempotencyKey },
      body: { companyId, branchId, transferVoucher, transferredAt: transferredAt ?? new Date().toISOString() },
    })
    .then(({ data, error, response }) => {
      if (error || !data) commandError(version, error, response.status);
      return data as unknown as ReservationSummary;
    });
}

/** C3 - Recordatorio 3 horas antes (POST .../commands/register-reminder). */
export interface ReservationReminderResponse {
  id: string;
  reservationId: string;
  channel: 'WHATSAPP' | 'EMAIL';
  reminderType: 'HOURS_3_BEFORE';
  status: 'SENT' | 'FAILED';
  sentAt?: string | null;
  failureReason?: string | null;
  registeredBy: string;
  createdAt: string;
}

export function registerReservationReminder(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  _channel: 'WHATSAPP' | 'EMAIL',
  _reminderType: 'HOURS_3_BEFORE',
  status: 'SENT' | 'FAILED',
  failureReason?: string,
  idempotencyKey = crypto.randomUUID(),
): Promise<ReservationSummary> {
  if (version == null) {
    throw new ReservationCommandError(428, { code: 'IF_MATCH_REQUIRED', detail: 'Versión de reserva no disponible. Recarga e intenta de nuevo.' });
  }
  return reservationsApiClient
    .POST('/reservations/{id}/commands/register-reminder', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': idempotencyKey },
      body: { companyId, branchId, result: status, note: failureReason },
    })
    .then(({ data, error, response }) => {
      if (error || !data) commandError(version, error, response.status);
      return data as unknown as ReservationSummary;
    });
}

/** C1 - Servicio de aeropuerto (POST .../commands/request-airport-service). */
export interface AirportServiceResponse {
  id: string;
  reservationId?: string | null;
  rentalId?: string | null;
  scheduledAt: string;
  location: string;
  additionalAmount: string;
  currency: string;
  notes?: string | null;
  requestedBy: string;
  createdAt: string;
}

export function requestReservationAirportService(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  scheduledAt: string,
  location: string,
  additionalAmount: string,
  notes?: string,
  idempotencyKey = crypto.randomUUID(),
): Promise<ReservationSummary> {
  if (version == null) {
    throw new ReservationCommandError(428, { code: 'IF_MATCH_REQUIRED', detail: 'Versión de reserva no disponible. Recarga e intenta de nuevo.' });
  }
  return reservationsApiClient
    .POST('/reservations/{id}/commands/request-airport-service', {
      params: { path: { id }, header: { 'If-Match': `"${version}"` } },
      headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': idempotencyKey },
      body: { companyId, branchId, scheduledAt, location, additionalAmount, notes },
    })
    .then(({ data, error, response }) => {
      if (error || !data) commandError(version, error, response.status);
      return data as unknown as ReservationSummary;
    });
}

export async function getReservationAirportService(
  idToken: string,
  id: string,
  _companyId: string,
  _branchId: string,
): Promise<AirportServiceResponse | null> {
  const { data, error, response } = await reservationsApiClient.GET('/reservations/{id}/airport-service', {
    params: { path: { id } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (response.status === 404) return null;
  if (error || !data) throw new ReservationApiError(response.status);
  return data as unknown as AirportServiceResponse;
}
