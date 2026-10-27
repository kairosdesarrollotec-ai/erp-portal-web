import type { RentalStatus, NotaryResult, AlcoholTestResult } from './rental-status';
import { rentalsApiClient } from '../../api/rentals-api-client';
import type { components } from '../../api/rentals.generated';
import type { GuaranteePaymentBody } from '../shared/payment-proof';
export type { RentalStatus, NotaryResult, AlcoholTestResult };

type CreateRentalBody = components['schemas']['CreateRentalRequest'];
type CreateRentalFromReservationBody = components['schemas']['CreateRentalFromReservationRequest'];
type ValidateDocumentsBody = components['schemas']['ValidateDocumentsRequest'];
type RegisterAlcoholTestBody = components['schemas']['RegisterAlcoholTestRequest'];
type EvaluateNotaryBody = components['schemas']['EvaluateNotaryRequest'];
type ApproveNotaryExceptionBody = components['schemas']['ApproveNotaryExceptionRequest'];
type FormalizeContractBody = components['schemas']['FormalizeContractRequest'];
type CompleteDeliveryBody = components['schemas']['CompleteDeliveryRequest'];
type RegisterAuthorizedDriverBody = components['schemas']['RegisterAuthorizedDriverRequest'];
type RegisterCompanionBody = components['schemas']['RegisterCompanionRequest'];
type SetCompanyDriverDailyRateBody = components['schemas']['SetCompanyDriverDailyRateRequest'];

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
    /** `missingDocuments`/`requiredDocuments` llegan en 422 DOCUMENTS_INCOMPLETE (BR-CON-004). */
    public readonly problem: { code?: string; detail?: string; missingDocuments?: unknown; requiredDocuments?: unknown } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

export interface RentalPartyResponse {
  id: string;
  customerId: string;
  role: 'SIGNER' | 'DRIVER' | 'RESPONSIBLE';
  /** Adenda firmada del conductor autorizado (DRIVER de persona juridica, DEC-ALQ-OWN-DRIVER-005). */
  addendumDocumentRef?: string | null;
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
  /** DEC-ALQ-THIRDPATH-001: casilla de verificacion biometrica favorable registrada por el personal. */
  biometricVerified?: boolean;
  biometricVerifiedBy?: string | null;
  /** Alquileres previos CERRADOS del cliente usados en la decision (cliente antiguo = mas de 2). */
  previousRentalsCount?: number | null;
  /** true = falta aprobacion de Gerencia (THIRD_PATH_ELIGIBLE / MANUAL_REVIEW sin approvedBy). */
  pendingApproval?: boolean;
  /** Solo en la respuesta de evaluate-notary. */
  vehicleThirdPathEligible?: boolean;
  depositMultiplier?: 1 | 2;
  requiredGuarantee?: RentalRequiredGuarantee | null;
}

/** BR-CON-004: documento requerido segun la nacionalidad del cliente (fuente de verdad: `requiredDocuments` del alquiler). */
export interface RentalRequiredDocument {
  code: string;
  label: string;
  /** DOCUMENT = el personal lo valida (archivo); DATA = dato del cliente (p. ej. fecha de ingreso al pais). */
  kind: 'DOCUMENT' | 'DATA';
  /** Campo de validate-documents con el que se confirma (null para DATA). */
  field: string | null;
}

/** Garantia exigida: tarifa de Flota x multiplicador notarial (x2 con DOUBLE_DEPOSIT). */
export interface RentalRequiredGuarantee {
  baseAmount: string;
  multiplier: 1 | 2;
  amount: string;
}

export interface RentalCancellation {
  reason: string;
  note: string | null;
  cancelledAt: string;
  cancelledBy: string;
}

/** Comprobante del cobro de la garantia (decision 8, BR-ALQ-011). */
export interface RentalGuaranteePayment {
  amount: string;
  method: string;
  operationNumber: string | null;
  payerName: string;
  payerDocumentNumber: string | null;
  payerIsExternalAgent: boolean;
  externalAgentVerifiedBy: string | null;
  voucherDocumentId: string | null;
  registeredBy: string | null;
}

export interface RentalContractResponse {
  id: string;
  templateVersionId: string;
  documentRef: string;
  status: string;
  signedAt: string | null;
  contractVariant?: string | null;
  fingerprintTaken?: boolean;
  createdAt: string;
}

export type ContractHolderType = 'NATURAL' | 'LEGAL';

export interface ContractTemplateSelectionResponse {
  variant: { holderType: ContractHolderType; withCompanyDriver: boolean } | null;
  requestedType: string;
  fallbackUsed: boolean;
  template: { id: string; type: string; name: string; versionNumber?: number } | null;
  [k: string]: unknown;
}

export interface ReservationCreditResponse {
  reservationId: string;
  applied: boolean;
  reason: 'APPLIED' | 'NO_RESERVATION' | 'RESERVATION_NOT_ACTIVE' | 'PAYMENT_NOT_VALIDATED' | string;
  creditAmount: string;
  currency: string;
  [k: string]: unknown;
}

export interface ExtensionRequirementsResponse {
  noticeGiven: boolean | null;
  authorized: boolean;
  paid: boolean;
  addendumSigned: boolean;
}

export interface RentalExtensionResponse {
  id: string;
  status: string;
  requestedEndAt?: string | null;
  requestedAt?: string | null;
  requirements: ExtensionRequirementsResponse;
  [k: string]: unknown;
}

export interface RentalDepositResponse {
  id: string;
  originalAmount: string;
  currency: string;
  reservationCreditAmount?: string;
  amountCollected?: string;
  /** Comprobante del cobro (null si no hubo cobro o el deposito es previo). */
  payment?: RentalGuaranteePayment | null;
  status: string;
  createdAt: string;
}

/**
 * Servicio de conductor de la empresa: tarifa diaria x dias (DEC-ALQ-DRIVERRATE-001, F-02). `source` indica el origen de la
 * tarifa: MANUAL (digitada en el alquiler) > ENV (parametro del sistema) > NOT_DEFINED (sin tarifa: cobro pendiente de digitar).
 */
export interface CompanyDriverChargeResponse {
  configured: boolean;
  source: 'MANUAL' | 'ENV' | 'NOT_DEFINED';
  dailyRate: string;
  currency: string;
  days: number;
  total: string;
}

/** DEC-ALQ-VEHDATA-001 (rentals.yaml 1.12.0): aviso por cada dato del vehículo que falta en Flota; no bloquea. */
export type VehicleDataWarning = components['schemas']['VehicleDataWarning'];

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
  /** DEC-ALQ-THIRDPATH-001: vehiculo marcado por Gerencia como elegible para la tercera via notarial. */
  vehicleThirdPathEligible?: boolean;
  /** BR-CON-004: nacionalidad efectiva del cliente. */
  customerNationality?: 'PERUANO' | 'EXTRANJERO';
  /** BR-CON-004: documentos requeridos para validar el alquiler segun la nacionalidad. */
  requiredDocuments?: RentalRequiredDocument[];
  /** Garantia exigida segun Flota y la evaluacion notarial (null si Flota no define garantia). */
  requiredGuarantee?: RentalRequiredGuarantee | null;
  /** DEC-ALQ-CANCEL-001: datos de la cancelacion manual (null si no aplica). */
  cancellation?: RentalCancellation | null;
  /** rentals.yaml 1.11.0: null = vehiculo sin capacidad registrada (sin tope). Opcional por compatibilidad con respuestas cacheadas. */
  vehiclePassengerCapacity?: number | null;
  /** rentals.yaml 1.12.0: precio del combustible del vehículo (PEN); null = no registrado en Flota. */
  vehicleFuelPrice?: number | null;
  /** rentals.yaml 1.12.0: un aviso por cada dato faltante del vehículo (capacidad, garantía, combustible). Opcional por compatibilidad con respuestas cacheadas. */
  vehicleWarnings?: VehicleDataWarning[];
  /** rentals.yaml 1.11.0: acompanantes registrados (parties RESPONSIBLE). */
  companionsCount?: number;
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
  /** Null si aun no se formalizo o si el alquiler es con conductor de la empresa (DEC-ALQ-COMPANY-DRIVER-004). */
  deposit?: RentalDepositResponse | null;
  /** false = con conductor de la empresa: no se exige ni cobra garantia. Se asume true si falta. */
  depositRequired?: boolean;
  reservationCredit?: ReservationCreditResponse | null;
  /** Solo con conductor de la empresa (GET detalle y tras set-company-driver-daily-rate); null/ausente en otro caso. */
  companyDriverCharge?: CompanyDriverChargeResponse | null;
  extensions?: RentalExtensionResponse[];
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

/**
 * ALQ-02 - crea un expediente de alquiler. Decision 22-oct: el alquiler solo nace de una Consulta, por eso
 * `inquiryId` es obligatorio. La via normal es `convertInquiryToRental` (CON-04); esta funcion queda por
 * compatibilidad y el backend puede responder 422 INQUIRY_CONVERSION_REQUIRED.
 */
export async function createRental(
  idToken: string,
  companyId: string,
  branchId: string,
  customerId: string,
  vehicleId: string,
  opts: { inquiryId: string; planCode?: string; startAt?: string; expectedEndAt?: string },
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

/**
 * ENTREGA-01 (BR-CON-004, 22-oct): los campos exigidos dependen de la nacionalidad del cliente.
 * PERUANO: identityDocumentValid (DNI) + driverLicenseValid + addressOrStayProofValid (recibo de agua o luz).
 * EXTRANJERO: passportValid + foreignerCardValid (CE) + driverLicenseValid + addressOrStayProofValid (constancia de hospedaje)
 * y fecha de ingreso registrada en el cliente. El tercer documento ya NO es opcional.
 */
export interface ValidateDocumentsPayload {
  identityDocumentValid?: boolean;
  passportValid?: boolean;
  foreignerCardValid?: boolean;
  driverLicenseValid?: boolean;
  addressOrStayProofValid?: boolean;
  notes?: string;
}

/** ENTREGA-01. */
export async function validateDocuments(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  payload?: ValidateDocumentsPayload,
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
  /** DEC-ALQ-THIRDPATH-001: verificacion biometrica favorable registrada por el personal (RENIEC/MTC fuera del MVP). */
  biometricVerified = false,
): Promise<{ rental: RentalResponse; evaluation: NotaryEvaluationResponse }> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/evaluate-notary', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, biometricVerified } as unknown as EvaluateNotaryBody,
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

/** ENTREGA-03 - plantilla que se usara segun titular y conductor (BR-DOC-003). */
export async function getContractTemplate(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  variant: { holderType: ContractHolderType; withCompanyDriver: boolean },
): Promise<ContractTemplateSelectionResponse> {
  const { data, error, response } = await rentalsApiClient.GET('/rentals/{id}/contract-template', {
    params: {
      path: { id },
      query: { companyId, branchId, holderType: variant.holderType, withCompanyDriver: variant.withCompanyDriver ? 'true' : 'false' },
    },
    headers: { Authorization: `Bearer ${idToken}` },
  } as never);
  if (error || !data) throw new RentalApiError(response.status);
  return data as unknown as ContractTemplateSelectionResponse;
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
  /** Omitir (null) con conductor de la empresa: no hay garantia (DEC-ALQ-COMPANY-DRIVER-004). */
  depositAmount: string | null,
  depositCurrency: 'PEN' | 'USD' | null,
  templateVersionId?: string,
  signatureData?: string,
  variant?: { holderType: ContractHolderType; withCompanyDriver: boolean },
  /** Decision 8 (BR-ALQ-011): comprobante del cobro de la garantia. Obligatorio si hay diferencia a cobrar. */
  payment?: GuaranteePaymentBody,
  /** C5 (BR-CON-005): Toma de huella dactilar física en contrato impreso. */
  fingerprintTaken?: boolean,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/formalize-contract', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: {
      companyId,
      branchId,
      ...(templateVersionId ? { templateVersionId } : {}),
      documentRef,
      // Con conductor de la empresa NO se envia garantia (si no, 422 DEPOSIT_NOT_APPLICABLE_WITH_COMPANY_DRIVER).
      ...(variant?.withCompanyDriver || depositAmount == null ? {} : { depositAmount, depositCurrency: depositCurrency ?? 'PEN' }),
      ...(signatureData ? { signatureData } : {}),
      ...(variant ? { holderType: variant.holderType, withCompanyDriver: variant.withCompanyDriver } : {}),
      ...(payment && !variant?.withCompanyDriver ? { payment } : {}),
      ...(fingerprintTaken !== undefined ? { fingerprintTaken } : {}),
    } as unknown as FormalizeContractBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/**
 * ENTREGA-03 - digita la tarifa diaria del conductor de la empresa en el alquiler (DEC-ALQ-DRIVERRATE-001, F-02).
 * Solo con contrato "con conductor de la empresa" (422 COMPANY_DRIVER_RATE_NOT_APPLICABLE), alquiler no cerrado
 * (409 COMPANY_DRIVER_RATE_CLOSED) y monto > 0 con maximo 2 decimales (400 COMPANY_DRIVER_RATE_INVALID).
 * La respuesta trae `companyDriverCharge` con source MANUAL.
 */
export async function setCompanyDriverDailyRate(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  dailyRate: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/set-company-driver-daily-rate', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, dailyRate } as SetCompanyDriverDailyRateBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/**
 * ENTREGA-01 - registra al conductor propio autorizado de una persona JURIDICA con su adenda
 * (DEC-ALQ-OWN-DRIVER-005, BR-ALQ-015). Persona natural -> 422 NATURAL_PERSON_OWN_DRIVER_NOT_ALLOWED.
 */
export async function registerAuthorizedDriver(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  driverCustomerId: string,
  addendumDocumentRef: string,
  holderType?: ContractHolderType,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/register-authorized-driver', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: {
      companyId,
      branchId,
      driverCustomerId,
      addendumDocumentRef,
      ...(holderType ? { holderType } : {}),
    } as unknown as RegisterAuthorizedDriverBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/**
 * ENTREGA-01 - registra al acompanante autorizado de una persona NATURAL como responsable del contrato
 * (DEC-ALQ-COMPANION-006, BR-ALQ-015). Persona juridica -> 422 COMPANION_NOT_APPLICABLE_FOR_LEGAL_HOLDER.
 * No habilita al acompanante a conducir:
 * exige registrar al conductor real (party DRIVER) y los checks de licencia vigente verificada (la licencia no se guarda).
 */
export async function registerCompanion(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  companionCustomerId: string,
  driverCustomerId: string,
  companionLicenseVerified: boolean,
  driverLicenseVerified: boolean,
  reason: string,
  addendumDocumentRef?: string,
  holderType?: ContractHolderType,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/register-companion', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: {
      companyId,
      branchId,
      companionCustomerId,
      driverCustomerId,
      companionLicenseVerified,
      driverLicenseVerified,
      reason,
      ...(addendumDocumentRef ? { addendumDocumentRef } : {}),
      ...(holderType ? { holderType } : {}),
    } as unknown as RegisterCompanionBody,
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
  deleteRentalEvidence,
  type RentalDocumentType,
  type RentalDocumentContentType,
  type RentalDocumentRecord,
  requestRentalDocumentUploadSession,
  uploadFileToGcs,
  recordRentalDocument,
  listRentalDocuments,
} from './rentals-documents-client';

// --- DEC-ALQ-CANCEL-001 - cancelar alquiler antes de la entrega ---
export {
  RENTAL_CANCEL_REASONS,
  RENTAL_CANCEL_REASON_LABELS,
  type RentalCancelReason,
  cancelRental,
} from './rentals-cancel-client';

// --- UC-ALQ-006 / BR-ALQ-012 - Ciclo de vida de ampliaciones de alquiler ---
// Exportados desde rentals-extensions-client.ts para cumplir con File Size Pattern (<500 líneas).
export {
  requestExtension,
  authorizeExtension,
  rejectExtension,
  reportExtensionBreach,
} from './rentals-extensions-client';

// --- C1 (BR-ALQ-014) - Servicio de aeropuerto en alquiler ---
export interface RentalAirportServiceResponse {
  id: string;
  rentalId: string;
  status: string;
  scheduledAt: string;
  location: string;
  additionalAmount: string;
  currency: string;
  notes?: string | null;
  requestedBy?: string;
  createdAt?: string;
}

export async function requestRentalAirportService(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  scheduledAt: string,
  location: string,
  additionalAmount: string,
  notes?: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/request-airport-service', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, scheduledAt, location, additionalAmount, notes },
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

export async function getRentalAirportService(
  idToken: string,
  id: string,
  _companyId: string,
  _branchId: string,
): Promise<RentalAirportServiceResponse | null> {
  const { data, error, response } = await rentalsApiClient.GET('/rentals/{id}/airport-service', {
    params: { path: { id } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (response.status === 404) return null;
  if (error || !data) throw new RentalApiError(response.status);
  return data as unknown as RentalAirportServiceResponse;
}
