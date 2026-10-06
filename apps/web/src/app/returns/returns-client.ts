import { returnsApiClient } from '../../api/returns-api-client';
import type {
  AlcoholEscalation,
  AlcoholEscalationDecision,
  AssessDamageInput,
  CompleteInspectionInput,
  CosmeticTariffItem,
  CustodyHolder,
  DamageOrigin,
  DamageSeverity,
  ImmobilizationChargeResponse,
  ListReturnsOptions,
  ReceiveProvisionalInput,
  ResponsibilityDocumentInput,
  ResponsibilityDocumentSummary,
  ResolveAlcoholEscalationInput,
  ReturnAlcoholTestResult,
  ReturnDamageResponse,
  ReturnEvidenceContentType,
  ReturnEvidenceResponse,
  ReturnEvidenceType,
  ReturnEvidenceUploadSession,
  ReturnFuelLevel,
  ReturnResponse,
  ReturnStatus,
  CustomerRiskStatus,
} from './returns-types';

export type {
  AlcoholEscalation,
  AlcoholEscalationDecision,
  AssessDamageInput,
  CompleteInspectionInput,
  CosmeticTariffItem,
  CustodyHolder,
  CustomerRiskStatus,
  DamageOrigin,
  DamageSeverity,
  ImmobilizationChargeResponse,
  ListReturnsOptions,
  ReceiveProvisionalInput,
  ResponsibilityDocumentInput,
  ResponsibilityDocumentSummary,
  ResolveAlcoholEscalationInput,
  ReturnAlcoholTestResult,
  ReturnDamageResponse,
  ReturnEvidenceContentType,
  ReturnEvidenceResponse,
  ReturnEvidenceType,
  ReturnEvidenceUploadSession,
  ReturnFuelLevel,
  ReturnResponse,
  ReturnStatus,
};

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

function authHeaders(idToken: string): Record<string, string> {
  return { Authorization: `Bearer ${idToken}` };
}

function commandHeaders(idToken: string, version?: number): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Idempotency-Key': crypto.randomUUID(),
  };
  if (version !== undefined) headers['If-Match'] = `"${version}"`;
  return headers;
}

/** DEV-01 - bandeja (GET /returns, paginacion keyset). */
export async function listReturns(
  idToken: string,
  companyId: string,
  branchId: string,
  options: ListReturnsOptions = {},
): Promise<ReturnResponse[]> {
  const { data, error, response } = await returnsApiClient.GET('/returns', {
    params: {
      query: {
        companyId,
        branchId,
        ...(options.status ? { status: options.status } : {}),
        ...(options.limit !== undefined ? { limit: options.limit } : {}),
        ...(options.cursor ? { cursorCreatedAt: options.cursor.createdAt, cursorId: options.cursor.id } : {}),
      } as Record<string, unknown>,
    },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new ReturnApiError(response.status);
  return data as unknown as ReturnResponse[];
}

/** Expediente de devolucion - fuente de verdad de cada pantalla del proceso. */
export async function getReturn(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.GET('/returns/{id}', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new ReturnApiError(response.status);
  return data as unknown as ReturnResponse;
}

/** DEV-01 - programa la devolucion de un alquiler activo (POST /returns). */
export async function scheduleReturn(
  idToken: string,
  companyId: string,
  branchId: string,
  rentalId: string,
  scheduledAt: string,
  notes?: string,
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns', {
    headers: commandHeaders(idToken),
    body: { companyId, branchId, rentalId, scheduledAt, ...(notes ? { notes } : {}) } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEV-02 - recepcion fisica provisional (POST /returns/receive-provisional). */
export async function receiveProvisional(
  idToken: string,
  companyId: string,
  branchId: string,
  rentalId: string,
  input: ReceiveProvisionalInput,
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/receive-provisional', {
    headers: commandHeaders(idToken),
    body: {
      companyId,
      branchId,
      rentalId,
      mileageAtReturn: input.mileageAtReturn,
      fuelLevelAtReturn: input.fuelLevelAtReturn,
      customerPresent: input.customerPresent,
      ...(input.notes ? { notes: input.notes } : {}),
    } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEV-03 - alcolimetro de salida. */
export async function registerReturnAlcoholTest(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  result: ReturnAlcoholTestResult,
  notes?: string,
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/register-alcohol-test', {
    params: { path: { id } },
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, result, ...(notes ? { notes } : {}) } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEV-04/05 - cierra el checklist y categoriza el estado de danos. */
export async function completeInspection(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: CompleteInspectionInput,
): Promise<ReturnResponse> {
  const { responsibilityDocument: doc } = input;
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/complete-inspection', {
    params: { path: { id } },
    headers: commandHeaders(idToken, version),
    body: {
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
    } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEV-03 - decision de Gerencia ante alcolimetro desfavorable/rechazado (BR-DEV-005). */
export async function resolveAlcoholEscalation(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: ResolveAlcoholEscalationInput,
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/resolve-alcohol-escalation', {
    params: { path: { id } },
    headers: commandHeaders(idToken, version),
    body: {
      companyId,
      branchId,
      decision: input.decision,
      markCustomerRed: input.markCustomerRed,
      notes: input.notes,
    } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEV-06/07/08 - evalua un dano (estetico por tarifario / tecnico por informe Motrix). */
export async function assessDamage(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: AssessDamageInput,
): Promise<ReturnDamageResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/assess-damage', {
    params: { path: { id } },
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, ...input } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnDamageResponse;
}

/** DEV-08 - cobro de dias de paralizacion (BR-DEV-011). La tarifa diaria la fija el servidor (la del vehiculo). */
export async function chargeImmobilization(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: { damageId?: string; daysCharged: number; notes?: string },
): Promise<ImmobilizationChargeResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/charge-immobilization', {
    params: { path: { id } },
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, ...input } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ImmobilizationChargeResponse;
}

/** DEV-07 - tarifario oficial de danos esteticos (unica fuente: el backend). */
export async function getCosmeticTariff(idToken: string, companyId: string, branchId: string): Promise<CosmeticTariffItem[]> {
  const { data, error, response } = await returnsApiClient.GET('/returns/cosmetic-tariff', {
    params: { query: { companyId, branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new ReturnApiError(response.status);
  const body = data as unknown as { items?: CosmeticTariffItem[] };
  return body.items ?? [];
}

/** DEV-09 - cierre financiero de garantia y penalidades. */
export async function closeFinancial(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  refundAmount: number,
  retainedAmount: number,
  notes?: string,
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/close-financial', {
    params: { path: { id } },
    headers: commandHeaders(idToken, version),
    body: {
      companyId,
      branchId,
      refundAmount,
      retainedAmount,
      ...(notes ? { notes } : {}),
    } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEV-10 - cierre formal y archivo del expediente (accion irreversible). */
export async function closeReturn(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: { signatureData?: string; generateWarrantyAct?: boolean; notes?: string },
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/close', {
    params: { path: { id } },
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, ...input } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
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
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/evidence/upload-url', {
    params: { path: { id } },
    headers: commandHeaders(idToken),
    body: { companyId, branchId, type, zone, contentType, contentLength } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnEvidenceUploadSession;
}

/** Nota: esta llamada es directa a GCS (no al API backend), por eso usa fetch nativo. */
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

export async function recordReturnEvidence(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  type: ReturnEvidenceType,
  zone: string,
  objectUrl: string,
): Promise<ReturnEvidenceResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/evidence', {
    params: { path: { id } },
    headers: commandHeaders(idToken),
    body: { companyId, branchId, type, zone, objectUrl } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnEvidenceResponse;
}

export async function listReturnEvidence(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<ReturnEvidenceResponse[]> {
  const { data, error, response } = await returnsApiClient.GET('/returns/{id}/evidence', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new ReturnApiError(response.status);
  return data as unknown as ReturnEvidenceResponse[];
}

export interface ResponsibilityTemplateResult {
  type: string;
  name: string;
  content: string;
  version: number;
}

/** PROP-015b / BR-DEV-009 — plantilla activa del documento de responsabilidad para firma del cliente. */
export async function getResponsibilityTemplate(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<ResponsibilityTemplateResult> {
  const { data, error, response } = await returnsApiClient.GET('/returns/{id}/responsibility-template', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new ReturnApiError(response.status);
  return data as unknown as ResponsibilityTemplateResult;
}
