import type { RentalStatus, NotaryResult, AlcoholTestResult } from './rental-status';
import { rentalsApiClient } from '../../api/rentals-api-client';
import type { components } from '../../api/rentals.generated';
export type { RentalStatus, NotaryResult, AlcoholTestResult };

type CreateRentalBody = components['schemas']['CreateRentalRequest'];
type CreateRentalFromReservationBody = components['schemas']['CreateRentalFromReservationRequest'];
type ValidateDocumentsBody = components['schemas']['ValidateDocumentsRequest'];
type RegisterAlcoholTestBody = components['schemas']['RegisterAlcoholTestRequest'];
type EvaluateNotaryBody = components['schemas']['EvaluateNotaryRequest'];
type ApproveNotaryExceptionBody = components['schemas']['ApproveNotaryExceptionRequest'];
type FormalizeContractBody = components['schemas']['FormalizeContractRequest'];
type CompleteDeliveryBody = components['schemas']['CompleteDeliveryRequest'];

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
  vehicleDepositMinimum: number | null;
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

/** ALQ-01 - bandeja de alquileres (GET /rentals). */
export async function listRentals(
  idToken: string,
  companyId: string,
  branchId: string,
  status?: RentalStatus,
): Promise<RentalResponse[]> {
  const { data, error, response } = await rentalsApiClient.GET('/rentals', {
    params: {
      query: {
        companyId,
        branchId,
        ...(status ? { status } : {}),
      },
    },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) throw new RentalApiError(response.status);
  return data as unknown as RentalResponse[];
}

/** Detalle de un alquiler - fuente de verdad de cada etapa del asistente. */
export async function getRental(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.GET('/rentals/{id}', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) throw new RentalApiError(response.status);
  return data as unknown as RentalResponse;
}

/** ALQ-02 - crea un expediente de alquiler desde cero. */
export async function createRental(
  idToken: string,
  companyId: string,
  branchId: string,
  customerId: string,
  vehicleId: string,
  opts?: { planCode?: string; startAt?: string; expectedEndAt?: string; inquiryId?: string },
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals', {
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, customerId, vehicleId, ...opts } as unknown as CreateRentalBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/** ALQ-02 - crea el expediente a partir de una Reserva ("Continuar con alquiler"). */
export async function createRentalFromReservation(
  idToken: string,
  companyId: string,
  branchId: string,
  reservationId: string,
  planCode?: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/from-reservation/{reservationId}', {
    params: { path: { reservationId } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, ...(planCode ? { planCode } : {}) } as unknown as CreateRentalFromReservationBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/** ENTREGA-01. */
export async function validateDocuments(
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
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/validate-documents', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, ...payload } as unknown as ValidateDocumentsBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/** ENTREGA-02. */
export async function registerAlcoholTest(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  result: AlcoholTestResult,
  notes?: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/register-alcohol-test', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, result, notes } as unknown as RegisterAlcoholTestBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/** ENTREGA-03 - matriz notarial. */
export async function evaluateNotary(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
): Promise<{ rental: RentalResponse; evaluation: NotaryEvaluationResponse }> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/evaluate-notary', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId } as unknown as EvaluateNotaryBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as { rental: RentalResponse; evaluation: NotaryEvaluationResponse };
}

/** ENTREGA-03 - excepcion notarial (solo Gerencia, BR-ALQ-004). */
export async function approveNotaryException(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  justification: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/approve-notary-exception', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, justification } as unknown as ApproveNotaryExceptionBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/**
 * ENTREGA-03 - formaliza el contrato (accion irreversible).
 * `templateVersionId` es opcional: si se omite, el backend resuelve
 * automaticamente la plantilla ACTIVE vigente de la empresa (BR-DOC-002).
 */
export async function formalizeContract(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  documentRef: string,
  depositAmount: string,
  depositCurrency: 'PEN' | 'USD',
  templateVersionId?: string,
  signatureData?: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/formalize-contract', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: {
      companyId,
      branchId,
      ...(templateVersionId ? { templateVersionId } : {}),
      documentRef,
      depositAmount,
      depositCurrency,
      ...(signatureData ? { signatureData } : {}),
    } as unknown as FormalizeContractBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/**
 * ENTREGA-04/05 - confirmacion de entrega (accion irreversible). BR-INS-003/004
 * ya no se valida con photosCount/videosCount (quedan deprecados en el
 * backend) sino contra la evidencia real registrada via
 * POST /rentals/:id/evidence - ver Stage4ChecklistScreen.
 */
export async function completeDelivery(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  notes?: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/complete-delivery', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, notes } as unknown as CompleteDeliveryBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

// --- ALQ-09 / BR-INS-003/004 - evidencia y documentos de alquiler ---
// Exportados desde rentals-documents-client.ts para cumplir con File Size Pattern (<500 líneas).
export {
  type RentalEvidenceType,
  type RentalEvidenceZone,
  type RentalEvidenceContentType,
  type EvidenceUploadSessionResponse,
  type RentalEvidenceResponse,
  GcsEvidenceUploadError,
  requestEvidenceUploadSession,
  uploadEvidenceToGcs,
  recordEvidence,
  listRentalEvidence,
  type RentalDocumentType,
  type RentalDocumentContentType,
  type RentalDocumentRecord,
  requestRentalDocumentUploadSession,
  uploadFileToGcs,
  recordRentalDocument,
  listRentalDocuments,
} from './rentals-documents-client';

// --- UC-ALQ-006 / BR-ALQ-012 - Ciclo de vida de ampliaciones de alquiler ---
// Exportados desde rentals-extensions-client.ts para cumplir con File Size Pattern (<500 líneas).
export {
  requestExtension,
  authorizeExtension,
  rejectExtension,
  reportExtensionBreach,
} from './rentals-extensions-client';
