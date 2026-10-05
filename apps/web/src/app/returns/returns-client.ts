import type {
  CustodyHolder,
  DamageOrigin,
  DamageSeverity,
  ReturnAlcoholTestResult,
  ReturnFuelLevel,
  ReturnStatus,
} from './return-status';
export type {
  CustodyHolder,
  DamageOrigin,
  DamageSeverity,
  ReturnAlcoholTestResult,
  ReturnFuelLevel,
  ReturnStatus,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/** Error HTTP de lectura (GET) - mismo patron que RentalApiError. */
export class ReturnApiError extends Error {
  readonly name = 'ReturnApiError';
  constructor(public readonly status: number) {
    super(`Error HTTP ${status} al consultar devoluciones`);
  }
}

/** Cuerpo `problem+json` que el backend devuelve en 4xx de comandos. */
export class ReturnCommandError extends Error {
  readonly name = 'ReturnCommandError';
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

export class ReturnEvidenceUploadError extends Error {
  readonly name = 'ReturnEvidenceUploadError';
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

// Contrato: packages/contracts/openapi/returns.yaml (erp-api-local) - ReturnResponse.
export interface ReturnResponse {
  id: string;
  organizationId: string;
  operatingCompanyId: string;
  branchId: string;
  rentalId: string;
  vehicleId: string;
  customerId: string;
  vehiclePlate?: string | null;
  customerName?: string | null;
  status: ReturnStatus;
  custodyHolder: CustodyHolder;
  customerPresent: boolean;
  mileageAtReturn?: number | null;
  fuelLevelAtReturn?: ReturnFuelLevel | null;
  alcoholTestResult?: ReturnAlcoholTestResult | null;
  alcoholTestNotes?: string | null;
  /** Decision de Gerencia ante alcolimetro desfavorable (null si aun no hubo). */
  alcoholEscalation: AlcoholEscalation | null;
  /** Documento de responsabilidad firmado en la inspeccion (null antes de completarla; sin la firma). */
  responsibilityDocument: ResponsibilityDocumentSummary | null;
  scheduledAt: string;
  receivedAt?: string | null;
  inspectedAt?: string | null;
  closedAt?: string | null;
  finalSettlementAmount?: number | null;
  notes?: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  etag: string;
  /** Fuente de verdad de danos y cargos de paralizacion del expediente. */
  damages: ReturnDamageResponse[];
  immobilizationCharges: ImmobilizationChargeResponse[];
}

export type AlcoholEscalationDecision = 'CONTINUE_TO_INSPECTION' | 'KEEP_IN_CUSTODY';

export interface AlcoholEscalation {
  decision: AlcoholEscalationDecision;
  markCustomerRed: boolean;
  notes: string;
  decidedById: string;
  decidedAt: string;
}

export interface ResponsibilityDocumentInput {
  signerName: string;
  signerIsHolder: boolean;
  /** Obligatorio cuando quien firma no es el titular (EX-DEV-001). */
  signerRelationToHolder?: string;
  signatureData: string;
}

/** Lo que el expediente devuelve del documento (ResponsibilityDocumentResponse): nunca incluye signatureData. */
export interface ResponsibilityDocumentSummary {
  signerName: string;
  signerIsHolder: boolean;
  signerRelationToHolder?: string | null;
  signedAt?: string;
}

/** Semaforo del cliente tras evaluar un dano (assess-damage). */
export type CustomerRiskStatus = 'NORMAL' | 'AMBAR' | 'ROJO';

export interface ReturnDamageResponse {
  id: string;
  returnId: string;
  origin: DamageOrigin;
  severity: DamageSeverity;
  damagedZone?: string | null;
  estimatedAmount?: number | null;
  externalReportReference?: string | null;
  description?: string | null;
  customerRiskStatus?: CustomerRiskStatus | null;
  createdAt: string;
  returnVersion?: number;
  returnEtag?: string;
}

export interface ImmobilizationChargeResponse {
  id: string;
  returnId: string;
  damageId?: string | null;
  daysCharged: number;
  dailyRate: number;
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  returnVersion?: number;
  returnEtag?: string;
}

export type ReturnEvidenceType = 'PHOTO' | 'VIDEO';
export type ReturnEvidenceContentType = 'image/jpeg' | 'image/webp' | 'video/mp4' | 'video/webm';

export interface ReturnEvidenceUploadSession {
  uploadUrl: string;
  objectUrl: string;
  expiresAt: string;
}

export interface ReturnEvidenceResponse {
  id: string;
  returnId: string;
  type: ReturnEvidenceType;
  zone: string;
  objectUrl: string;
  createdAt: string;
}

function authHeaders(idToken: string): Record<string, string> {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
}

function scopeParams(companyId: string, branchId: string, extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ companyId, branchId });
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value !== undefined) params.set(key, value);
  }
  return params.toString();
}

export interface ListReturnsOptions {
  status?: ReturnStatus;
  limit?: number;
  cursor?: { createdAt: string; id: string };
}

/** DEV-01 - bandeja (GET /returns, paginacion keyset). */
export async function listReturns(
  idToken: string,
  companyId: string,
  branchId: string,
  options: ListReturnsOptions = {},
): Promise<ReturnResponse[]> {
  const query = scopeParams(companyId, branchId, {
    status: options.status,
    limit: options.limit !== undefined ? String(options.limit) : undefined,
    cursorCreatedAt: options.cursor?.createdAt,
    cursorId: options.cursor?.id,
  });
  const response = await fetch(`${API_BASE_URL}/returns?${query}`, { headers: authHeaders(idToken) });
  if (!response.ok) throw new ReturnApiError(response.status);
  return (await response.json()) as ReturnResponse[];
}

/** Expediente de devolucion - fuente de verdad de cada pantalla del proceso. */
export async function getReturn(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<ReturnResponse> {
  const response = await fetch(`${API_BASE_URL}/returns/${id}?${scopeParams(companyId, branchId)}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) throw new ReturnApiError(response.status);
  return (await response.json()) as ReturnResponse;
}

async function postJson<T>(
  idToken: string,
  path: string,
  version: number | undefined,
  body: Record<string, unknown>,
): Promise<T> {
  const headers = authHeaders(idToken);
  headers['Idempotency-Key'] = crypto.randomUUID();
  if (version !== undefined) headers['If-Match'] = `"${version}"`;
  const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ReturnCommandError(response.status, problem);
  }
  return (await response.json()) as T;
}

/** DEV-01 - programa la devolucion de un alquiler activo (POST /returns). */
export function scheduleReturn(
  idToken: string,
  companyId: string,
  branchId: string,
  rentalId: string,
  scheduledAt: string,
  notes?: string,
): Promise<ReturnResponse> {
  return postJson(idToken, '/returns', undefined, { companyId, branchId, rentalId, scheduledAt, ...(notes ? { notes } : {}) });
}

export interface ReceiveProvisionalInput {
  mileageAtReturn: number;
  fuelLevelAtReturn: ReturnFuelLevel;
  customerPresent: boolean;
  notes?: string;
}

/** DEV-02 - recepcion fisica provisional (POST /returns/receive-provisional). */
export function receiveProvisional(
  idToken: string,
  companyId: string,
  branchId: string,
  rentalId: string,
  input: ReceiveProvisionalInput,
): Promise<ReturnResponse> {
  return postJson(idToken, '/returns/receive-provisional', undefined, {
    companyId,
    branchId,
    rentalId,
    mileageAtReturn: input.mileageAtReturn,
    fuelLevelAtReturn: input.fuelLevelAtReturn,
    customerPresent: input.customerPresent,
    ...(input.notes ? { notes: input.notes } : {}),
  });
}

/** DEV-03 - alcolimetro de salida. */
export function registerReturnAlcoholTest(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  result: ReturnAlcoholTestResult,
  notes?: string,
): Promise<ReturnResponse> {
  return postJson(idToken, `/returns/${id}/commands/register-alcohol-test`, version, {
    companyId,
    branchId,
    result,
    ...(notes ? { notes } : {}),
  });
}

export interface CompleteInspectionInput {
  hasDamages: boolean;
  damagesDescription?: string;
  notes?: string;
  /** Obligatorio (BR-DEV-009): sin el, el backend responde 422 MISSING_RESPONSIBILITY_DOCUMENT. */
  responsibilityDocument: ResponsibilityDocumentInput;
}

/** DEV-04/05 - cierra el checklist y categoriza el estado de danos. */
export function completeInspection(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: CompleteInspectionInput,
): Promise<ReturnResponse> {
  const { responsibilityDocument: doc } = input;
  return postJson(idToken, `/returns/${id}/commands/complete-inspection`, version, {
    companyId,
    branchId,
    hasDamages: input.hasDamages,
    ...(input.damagesDescription ? { damagesDescription: input.damagesDescription } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    responsibilityDocument: {
      signerName: doc.signerName,
      signerIsHolder: doc.signerIsHolder,
      ...(!doc.signerIsHolder && doc.signerRelationToHolder ? { signerRelationToHolder: doc.signerRelationToHolder } : {}),
      signatureData: doc.signatureData,
    },
  });
}

export interface ResolveAlcoholEscalationInput {
  decision: AlcoholEscalationDecision;
  markCustomerRed: boolean;
  notes: string;
}

/** DEV-03 - decision de Gerencia ante alcolimetro desfavorable/rechazado (BR-DEV-005). */
export function resolveAlcoholEscalation(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: ResolveAlcoholEscalationInput,
): Promise<ReturnResponse> {
  return postJson(idToken, `/returns/${id}/commands/resolve-alcohol-escalation`, version, {
    companyId,
    branchId,
    decision: input.decision,
    markCustomerRed: input.markCustomerRed,
    notes: input.notes,
  });
}

export interface AssessDamageInput {
  origin: DamageOrigin;
  severity: DamageSeverity;
  damagedZone?: string;
  estimatedAmount?: number;
  externalReportReference?: string;
  description?: string;
  /** Pregunta "¿El cliente acepta el costo?" - afecta el semaforo del cliente (LEVE/MODERADO). */
  customerAcceptsCost?: boolean;
}

/** DEV-06/07/08 - evalua un dano (estetico por tarifario / tecnico por informe Motrix). */
export function assessDamage(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: AssessDamageInput,
): Promise<ReturnDamageResponse> {
  return postJson(idToken, `/returns/${id}/commands/assess-damage`, version, { companyId, branchId, ...input });
}

/** DEV-08 - cobro de dias de paralizacion (BR-DEV-011). La tarifa diaria la fija el servidor (la del vehiculo). */
export function chargeImmobilization(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: { damageId?: string; daysCharged: number; notes?: string },
): Promise<ImmobilizationChargeResponse> {
  return postJson(idToken, `/returns/${id}/commands/charge-immobilization`, version, {
    companyId,
    branchId,
    ...input,
  });
}

export interface CosmeticTariffItem {
  code: string;
  name: string;
  pricePen: number;
}

/** DEV-07 - tarifario oficial de danos esteticos (unica fuente: el backend). */
export async function getCosmeticTariff(idToken: string, companyId: string, branchId: string): Promise<CosmeticTariffItem[]> {
  const response = await fetch(`${API_BASE_URL}/returns/cosmetic-tariff?${scopeParams(companyId, branchId)}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) throw new ReturnApiError(response.status);
  const body = (await response.json()) as { items?: CosmeticTariffItem[] };
  return body.items ?? [];
}

/** DEV-09 - cierre financiero de garantia y penalidades. */
export function closeFinancial(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  refundAmount: number,
  retainedAmount: number,
  notes?: string,
): Promise<ReturnResponse> {
  return postJson(idToken, `/returns/${id}/commands/close-financial`, version, {
    companyId,
    branchId,
    refundAmount,
    retainedAmount,
    ...(notes ? { notes } : {}),
  });
}

/** DEV-10 - cierre formal y archivo del expediente (accion irreversible). */
export function closeReturn(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: { signatureData?: string; generateWarrantyAct?: boolean; notes?: string },
): Promise<ReturnResponse> {
  return postJson(idToken, `/returns/${id}/commands/close`, version, { companyId, branchId, ...input });
}

// --- DEV-04 / TR-08 - evidencia real (foto/video) de retorno ---
// Mismo patron de 3 pasos que Alquiler (ALQ-09): URL firmada -> PUT a GCS ->
// registro en backend.

export async function requestReturnEvidenceUploadSession(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  type: ReturnEvidenceType,
  zone: string,
  contentType: ReturnEvidenceContentType,
  contentLength: number,
): Promise<ReturnEvidenceUploadSession> {
  return postJson(idToken, `/returns/${id}/evidence/upload-url`, undefined, {
    companyId,
    branchId,
    type,
    zone,
    contentType,
    contentLength,
  });
}

export async function uploadReturnEvidenceToGcs(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!response.ok) {
    throw new ReturnEvidenceUploadError(`Error al subir el archivo a GCS (${response.status})`, response.status);
  }
}

export function recordReturnEvidence(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  type: ReturnEvidenceType,
  zone: string,
  objectUrl: string,
): Promise<ReturnEvidenceResponse> {
  return postJson(idToken, `/returns/${id}/evidence`, undefined, { companyId, branchId, type, zone, objectUrl });
}

export async function listReturnEvidence(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<ReturnEvidenceResponse[]> {
  const response = await fetch(`${API_BASE_URL}/returns/${id}/evidence?${scopeParams(companyId, branchId)}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) throw new ReturnApiError(response.status);
  return (await response.json()) as ReturnEvidenceResponse[];
}
