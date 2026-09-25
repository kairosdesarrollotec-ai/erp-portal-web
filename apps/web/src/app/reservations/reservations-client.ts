import type { ChannelMode, ReservationStatus } from './reservation-status';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
}

/** RES-01 - bandeja de reservas (TDD-RES-001.md 11, GET /reservations). */
export async function listReservations(
  idToken: string,
  companyId: string,
  branchId: string,
  status?: ReservationStatus,
): Promise<ReservationSummary[]> {
  const params = new URLSearchParams({ companyId, branchId });
  if (status) params.set('status', status);
  const response = await fetch(`${API_BASE_URL}/reservations?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) throw new ReservationApiError(response.status);
  return (await response.json()) as ReservationSummary[];
}

/** RES-04/RES-05 - detalle de una reserva. */
export async function getReservation(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<ReservationSummary> {
  const params = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/reservations/${id}?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) throw new ReservationApiError(response.status);
  return (await response.json()) as ReservationSummary;
}

async function postCommand(
  idToken: string,
  id: string,
  command: string,
  version: number,
  body: Record<string, unknown>,
): Promise<ReservationSummary> {
  const response = await fetch(`${API_BASE_URL}/reservations/${id}/commands/${command}`, {
    method: 'POST',
    headers: { ...authHeaders(idToken), 'If-Match': `"${version}"`, 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ReservationCommandError(response.status, problem);
  }
  return (await response.json()) as ReservationSummary;
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

export function registerPayment(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
): Promise<ReservationSummary> {
  return postCommand(idToken, id, 'register-payment', version, { companyId, branchId });
}

export function registerDocuments(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
): Promise<ReservationSummary> {
  return postCommand(idToken, id, 'register-documents', version, { companyId, branchId });
}

export function confirmReservation(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
): Promise<ReservationSummary> {
  return postCommand(idToken, id, 'confirm', version, { companyId, branchId });
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
  return postCommand(idToken, id, 'cancel', version, { companyId, branchId, reason, note });
}
