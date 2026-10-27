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
  RegisterReminderInput,
  ReturnAlertItem,
  ReturnAlertType,
  ReturnAlerts,
  ReturnLateness,
  ReturnLatenessCharge,
  LatenessTier,
  ReturnReminder,
  ReturnReminderInboxItem,
  ReturnReminderResult,
  ReturnReminderStatus,
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
  RegisterReminderInput,
  ReturnAlertItem,
  ReturnAlertType,
  ReturnAlerts,
  ReturnLateness,
  ReturnLatenessCharge,
  LatenessTier,
  ReturnReminder,
  ReturnReminderInboxItem,
  ReturnReminderResult,
  ReturnReminderStatus,
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
      },
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
      ...(input.identityVerified !== undefined ? { identityVerified: input.identityVerified } : {}),
      ...(input.identityDocumentType ? { identityDocumentType: input.identityDocumentType } : {}),
      ...(input.identityDocumentNumber ? { identityDocumentNumber: input.identityDocumentNumber } : {}),
      ...(input.identityMatchesHolder !== undefined ? { identityMatchesHolder: input.identityMatchesHolder } : {}),
      ...(input.identityResult ? { identityResult: input.identityResult } : {}),
      ...(input.observation ? { observation: input.observation } : {}),
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
    params: { path: { id } } as unknown as never,
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, result, ...(notes ? { notes } : {}) } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEC-DEV-LATE-CHARGE-002 - cargo por retraso MANUAL (monto digitado por usuario autorizado; sin cálculo automático). */
export async function registerReturnLateCharge(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  amount: number,
  notes?: string,
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/register-late-charge', {
    params: { path: { id } } as unknown as never,
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, amount, ...(notes ? { notes } : {}) } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEC-DEV-FUEL-PENALTY-001 (BDD-04 §9.6.1) - multa por combustible faltante manual / ajustada. */
export async function registerReturnFuelPenalty(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  amount: number,
  reason: string,
): Promise<ReturnResponse> {
  const { data, error, response } = await (returnsApiClient as any).POST('/returns/{id}/commands/register-fuel-penalty', {
    params: { path: { id } } as unknown as never,
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, amount, reason } as unknown as never,
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
    params: { path: { id } } as unknown as never,
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
    params: { path: { id } } as unknown as never,
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
    params: { path: { id } } as unknown as never,
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
    params: { path: { id } } as unknown as never,
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
    params: { path: { id } } as unknown as never,
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
    params: { path: { id } } as unknown as never,
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, ...input } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEC-DEV-IMMOBILIZE-001 - registra aceptación o rechazo del informe mecánico/Motrix por parte del cliente. */
export async function recordMechanicReport(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: { accepted: boolean; observation?: string },
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/record-mechanic-report', {
    params: { path: { id } } as unknown as never,
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, ...input } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

/** DEC-DEV-LEGAL-001 - anota la escalación del expediente al área legal. */
export async function escalateLegal(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  input: { reason: string; legalCaseNumber?: string },
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/escalate-legal', {
    params: { path: { id } } as unknown as never,
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, ...input } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
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

// --- DEV-01 / BR-DEV-004 - recordatorios (envio manual-asistido por WhatsApp) -----------------

/** DEV-01 - bandeja de recordatorios. Sin `status` el backend devuelve PENDING + FAILED, el mas urgente primero. */
export async function listReturnReminders(
  idToken: string,
  companyId: string,
  branchId: string,
  options: { status?: ReturnReminderStatus; limit?: number } = {},
): Promise<ReturnReminderInboxItem[]> {
  const { data, error, response } = await returnsApiClient.GET('/returns/reminders', {
    params: {
      query: {
        companyId,
        branchId,
        ...(options.status ? { status: options.status } : {}),
        ...(options.limit !== undefined ? { limit: options.limit } : {}),
      },
    },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new ReturnApiError(response.status);
  return data as unknown as ReturnReminderInboxItem[];
}

/** El If-Match del recordatorio lleva su `etag` tal cual (ya viene entrecomillado); si llegara sin comillas se agregan. */
function reminderIfMatch(etag: string): string {
  return etag.startsWith('"') || etag.startsWith('W/') ? etag : `"${etag}"`;
}

/**
 * DEV-01 - registra el resultado del envio manual del recordatorio. If-Match = `reminder.etag`
 * (version del recordatorio; el comando NO cambia la version del expediente).
 */
export async function registerReturnReminder(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  reminderEtag: string,
  input: RegisterReminderInput,
): Promise<ReturnReminder> {
  const headers = commandHeaders(idToken);
  headers['If-Match'] = reminderIfMatch(reminderEtag);
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/register-reminder', {
    params: { path: { id } } as unknown as never,
    headers,
    body: {
      companyId,
      branchId,
      result: input.result,
      ...(input.sentAt ? { sentAt: input.sentAt } : {}),
      ...(input.note ? { note: input.note } : {}),
    } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnReminder;
}

// --- DEV-07 / DEV-08 - alertas operativas ----------------------------------------------------

/** Garantia por liberar (24 h) e inmovilizacion > 24 h sin cobrar. Solo lectura; sin `type` trae ambos tipos. */
export async function listReturnAlerts(
  idToken: string,
  companyId: string,
  branchId: string,
  options: { type?: ReturnAlertType; limit?: number } = {},
): Promise<ReturnAlertItem[]> {
  const { data, error, response } = await returnsApiClient.GET('/returns/alerts', {
    params: {
      query: {
        companyId,
        branchId,
        ...(options.type ? { type: options.type } : {}),
        ...(options.limit !== undefined ? { limit: options.limit } : {}),
      },
    },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new ReturnApiError(response.status);
  return data as unknown as ReturnAlertItem[];
}

// --- DEV-05 / PD-07 - marcas por zona de DEV-05 persistidas en el servidor ------------------

export interface ReturnZoneMarkItem {
  zone: 'FRONTAL' | 'LATERAL_IZQUIERDO' | 'LATERAL_DERECHO' | 'POSTERIOR' | 'INTERIOR';
  mark: 'NO_DAMAGE' | 'DAMAGE';
  markedBy?: string;
  markedAt?: string;
}

export interface ReturnZoneMarksResult {
  returnId: string;
  marks: ReturnZoneMarkItem[];
  complete: boolean;
  route: 'NO_DAMAGE' | 'DAMAGE' | null;
}

export async function getReturnZoneMarks(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<ReturnZoneMarksResult> {
  const { data, error, response } = await returnsApiClient.GET('/returns/{id}/zone-marks', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new ReturnApiError(response.status);
  return data as unknown as ReturnZoneMarksResult;
}

export async function recordReturnZoneMarks(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  marks: Array<{
    zone: 'FRONTAL' | 'LATERAL_IZQUIERDO' | 'LATERAL_DERECHO' | 'POSTERIOR' | 'INTERIOR';
    mark: 'NO_DAMAGE' | 'DAMAGE';
  }>,
): Promise<ReturnZoneMarksResult> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/zone-marks', {
    params: { path: { id } },
    headers: authHeaders(idToken),
    body: { companyId, branchId, marks },
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnZoneMarksResult;
}

/** SC-DEV-004.01 / EX-DEV-001 - Notificación formal al titular ausente cuando devuelve un tercero. */
export async function recordHolderNotification(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  body: {
    channel: string;
    contactedAt: string;
    notifiedBy: string;
    observations?: string;
  },
): Promise<ReturnResponse> {
  const { data, error, response } = await returnsApiClient.POST('/returns/{id}/commands/record-holder-notification', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: commandHeaders(idToken, version),
    body: { companyId, branchId, ...body },
  });
  if (error || !data) {
    throw new ReturnCommandError(response?.status ?? 500, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnResponse;
}

// --- DEV-04 / TR-08 - evidencia real (foto/video) de retorno ---
export {
  ReturnEvidenceUploadError,
  requestReturnEvidenceUploadSession,
  uploadReturnEvidenceToGcs,
  recordReturnEvidence,
  listReturnEvidence,
  deleteReturnEvidence,
} from './returns-evidence-client';
