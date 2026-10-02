import type { RentalStatus, NotaryResult, AlcoholTestResult } from './rental-status';
export type { RentalStatus, NotaryResult, AlcoholTestResult };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/** Error HTTP de lectura (GET) - mismo patron que ReservationApiError. */
export class RentalApiError extends Error {
  readonly name = 'RentalApiError';
  constructor(public readonly status: number) {
    super(`Error HTTP ${status} al consultar alquileres`);
  }
}

/** Cuerpo `problem+json` que el backend devuelve en 409/422/403. */
export class RentalCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

export interface RentalPartyResponse {
  id: string;
  customerId: string;
  role: 'SIGNER' | 'DRIVER' | 'RESPONSIBLE';
  createdAt: string;
}

export interface NotaryEvaluationResponse {
  id: string;
  policyVersion: number;
  result: NotaryResult;
  reason: string;
  evaluatedAt: string;
  approvedBy: string | null;
  justification: string | null;
}

export interface RentalContractResponse {
  id: string;
  templateVersionId: string;
  documentRef: string;
  status: string;
  signedAt: string | null;
  createdAt: string;
}

export interface RentalDepositResponse {
  id: string;
  originalAmount: string;
  currency: string;
  status: string;
  createdAt: string;
}

export interface RentalResponse {
  id: string;
  organizationId: string;
  operatingCompanyId: string;
  branchId: string;
  inquiryId: string | null;
  reservationId: string | null;
  customerId: string;
  customerName: string;
  customerDocNumber: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  planCode: string;
  status: RentalStatus;
  startAt: string | null;
  expectedEndAt: string | null;
  alcoholTestResult: AlcoholTestResult | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  etag: string;
  parties?: RentalPartyResponse[];
  notaryEvaluation?: NotaryEvaluationResponse | null;
  contract?: RentalContractResponse | null;
  deposit?: RentalDepositResponse | null;
}

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
}

/** ALQ-01 - bandeja de alquileres (GET /rentals). */
export async function listRentals(
  idToken: string,
  companyId: string,
  branchId: string,
  status?: RentalStatus,
): Promise<RentalResponse[]> {
  const params = new URLSearchParams({ companyId, branchId });
  if (status) params.set('status', status);
  const response = await fetch(`${API_BASE_URL}/rentals?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) throw new RentalApiError(response.status);
  return (await response.json()) as RentalResponse[];
}

/** Detalle de un alquiler - fuente de verdad de cada etapa del asistente. */
export async function getRental(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<RentalResponse> {
  const params = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/rentals/${id}?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) throw new RentalApiError(response.status);
  return (await response.json()) as RentalResponse;
}

async function postCommand<T>(
  idToken: string,
  path: string,
  version: number | undefined,
  body: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = { ...(authHeaders(idToken) as Record<string, string>) };
  headers['Idempotency-Key'] = crypto.randomUUID();
  if (version !== undefined) headers['If-Match'] = `"${version}"`;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new RentalCommandError(response.status, problem);
  }
  return (await response.json()) as T;
}

/** ALQ-02 - crea un expediente de alquiler desde cero. */
export function createRental(
  idToken: string,
  companyId: string,
  branchId: string,
  customerId: string,
  vehicleId: string,
  opts?: { planCode?: string; startAt?: string; expectedEndAt?: string; inquiryId?: string },
): Promise<RentalResponse> {
  return postCommand(idToken, '/rentals', undefined, { companyId, branchId, customerId, vehicleId, ...opts });
}

/** ALQ-02 - crea el expediente a partir de una Reserva ("Continuar con alquiler"). */
export function createRentalFromReservation(
  idToken: string,
  companyId: string,
  branchId: string,
  reservationId: string,
  planCode?: string,
): Promise<RentalResponse> {
  return postCommand(idToken, `/rentals/from-reservation/${reservationId}`, undefined, {
    companyId,
    branchId,
    ...(planCode ? { planCode } : {}),
  });
}

/** ENTREGA-01. */
export function validateDocuments(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  payload?: {
    identityDocumentValid: boolean;
    driverLicenseValid: boolean;
    addressOrStayProofValid: boolean;
    notes?: string;
  },
): Promise<RentalResponse> {
  return postCommand(idToken, `/rentals/${id}/commands/validate-documents`, version, {
    companyId,
    branchId,
    ...payload,
  });
}

/** ENTREGA-02. */
export function registerAlcoholTest(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  result: AlcoholTestResult,
  notes?: string,
): Promise<RentalResponse> {
  return postCommand(idToken, `/rentals/${id}/commands/register-alcohol-test`, version, {
    companyId,
    branchId,
    result,
    notes,
  });
}

/** ENTREGA-03 - matriz notarial. */
export function evaluateNotary(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
): Promise<{ rental: RentalResponse; evaluation: NotaryEvaluationResponse }> {
  return postCommand(idToken, `/rentals/${id}/commands/evaluate-notary`, version, { companyId, branchId });
}

/** ENTREGA-03 - excepcion notarial (solo Gerencia, BR-ALQ-004). */
export function approveNotaryException(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  justification: string,
): Promise<RentalResponse> {
  return postCommand(idToken, `/rentals/${id}/commands/approve-notary-exception`, version, {
    companyId,
    branchId,
    justification,
  });
}

/**
 * ENTREGA-03 - formaliza el contrato (accion irreversible).
 * `templateVersionId` es opcional: si se omite, el backend resuelve
 * automaticamente la plantilla ACTIVE vigente de la empresa (BR-DOC-002).
 */
export function formalizeContract(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  documentRef: string,
  depositAmount: string,
  depositCurrency: 'PEN' | 'USD',
  templateVersionId?: string,
): Promise<RentalResponse> {
  return postCommand(idToken, `/rentals/${id}/commands/formalize-contract`, version, {
    companyId,
    branchId,
    ...(templateVersionId ? { templateVersionId } : {}),
    documentRef,
    depositAmount,
    depositCurrency,
  });
}

/** ENTREGA-04/05 - checklist y confirmacion de entrega (accion irreversible). */
export function completeDelivery(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  photosCount: number,
  videosCount: number,
  notes?: string,
): Promise<RentalResponse> {
  return postCommand(idToken, `/rentals/${id}/commands/complete-delivery`, version, {
    companyId,
    branchId,
    photosCount,
    videosCount,
    notes,
  });
}
