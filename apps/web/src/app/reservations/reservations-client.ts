import type { ChannelMode, ReservationStatus } from './reservation-status';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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

/** Igual patron que WorkContextApiError/DashboardApiError: permite
 * distinguir un fallo tecnico (401/403/404/5xx) de datos validos, en
 * listReservations/getReservation (findings #7). Los comandos mutables
 * (register-payment, confirm, cancel...) usan ReservationCommandError, mas
 * abajo, porque ademas traen el cuerpo `problem+json` (code, missingRequirements). */
export class ReservationApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ReservationApiError';
    this.status = status;
  }
}

/**
 * RES-01 - bandeja de reservas (TDD-RES-001.md 11, GET /reservations).
 *
 * Hallazgo de revision (finding #1, ALTO): antes esta funcion solo
 * filtraba por `companyId` - una empresa puede tener varias sedes, y sin
 * `branchId` la bandeja de una sede podia mezclar (o, peor, exponer)
 * reservas de otras sedes de la misma empresa. `branchId` es ahora
 * obligatorio, igual que en getReservation. El aislamiento real sigue
 * siendo responsabilidad del backend (debe validar empresa+sede+usuario
 * server-side, no solo filtrar por el query param que el cliente mande) -
 * este fix cierra el hueco del lado del cliente, que es lo que esta PR
 * puede corregir.
 */
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
  if (!response.ok) {
    throw new ReservationApiError(`No se pudo obtener la bandeja de reservas (${response.status})`, response.status);
  }
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
  if (!response.ok) {
    throw new ReservationApiError(`No se pudo obtener la reserva (${response.status})`, response.status);
  }
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
    headers: {
      ...authHeaders(idToken),
      'If-Match': `"${version}"`,
      // Hallazgo de revision (finding #6, parte "idempotency key backend"):
      // el contrato (TDD-RES-001.md 11) exige `Idempotency-Key` en todo
      // comando mutable - antes el cliente simplemente no lo mandaba, asi
      // que un reintento (doble clic, reintento de red) no tenia forma de
      // deduplicarse en el backend. Una key nueva por intento de mutacion
      // (no por reserva) es lo correcto: cada click del usuario es una
      // intencion nueva: si esa llamada especifica falla y el usuario
      // reintenta, es un reintento del MISMO intento y deberia reusar la
      // key - eso ya lo cubre el mutex de useReservationDetail.ts (finding
      // #6, primera parte): mientras una mutacion esta en vuelo, ningun
      // otro click (incluido un doble clic del mismo boton) puede iniciar
      // una segunda llamada.
      'Idempotency-Key': crypto.randomUUID(),
    },
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
