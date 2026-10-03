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
}

/** Cuerpo `problem+json` que el backend devuelve en 409/422 (TDD-RES-001.md 11.4). */
export class ReservationCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string; missingRequirements?: string[] } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

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
