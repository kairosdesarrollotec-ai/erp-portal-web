import { incidentsApiClient } from '../../api/incidents-api-client';
import type { components } from '../../api/incidents.generated';
import type { IncidentSeverity, IncidentStatus, IncidentType } from './incident-domain';

// Los tipos generados marcan como requeridos algunos campos con default o
// nullable; se acotan aqui a lo que el portal realmente consume.
export type IncidentResponse = components['schemas']['IncidentResponse'];
export type IncidentDetail = components['schemas']['IncidentDetailResponse'];
export type IncidentActionEntry = components['schemas']['IncidentActionEntry'];

type CreateBody = components['schemas']['CreateIncidentRequest'];
type AddActionBody = components['schemas']['AddIncidentActionRequest'];
type CloseBody = components['schemas']['CloseIncidentRequest'];
type ReferLegalBody = components['schemas']['ReferLegalRequest'];
/** Resultado estructurado de la decision de Gerencia (obligatorio al cerrar/derivar UNAUTHORIZED_DRIVER). */
export type ManagementDecisionOutcome = components['schemas']['ManagementDecisionOutcome'];

/** Error HTTP de lectura (GET) - mismo patron que ReturnApiError / InquiryApiError. */
export class IncidentApiError extends Error {
  readonly name = 'IncidentApiError';
  constructor(public readonly status: number) {
    super(`Error HTTP ${status} al consultar incidencias`);
  }
}

/** Cuerpo `problem+json` que el backend devuelve en 4xx de comandos. */
export class IncidentCommandError extends Error {
  readonly name = 'IncidentCommandError';
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

const authHeaders = (idToken: string) => ({ Authorization: `Bearer ${idToken}` });
/** Mismo formato que el resto de modulos: version entrecomillada (`"3"`). */
const ifMatch = (version: number) => `"${version}"`;

function toCommandError(error: unknown, status: number): IncidentCommandError {
  const problem = (error as { code?: string; detail?: string } | null | undefined) ?? null;
  return new IncidentCommandError(status, problem && typeof problem === 'object' ? problem : null);
}

export interface ListIncidentsOptions {
  type?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  rentalId?: string;
  returnId?: string;
  limit?: number;
  /** Paginacion keyset (cursorCreatedAt + cursorId del ultimo elemento). */
  cursor?: { createdAt: string; id: string };
}

/** INC-01 - bandeja (GET /incidents, paginacion keyset). */
export async function listIncidents(
  idToken: string,
  companyId: string,
  branchId: string,
  options: ListIncidentsOptions = {},
  signal?: AbortSignal,
): Promise<IncidentResponse[]> {
  const { data, error, response } = await incidentsApiClient.GET('/incidents', {
    params: {
      query: {
        companyId,
        branchId,
        ...(options.type ? { type: options.type } : {}),
        ...(options.severity ? { severity: options.severity } : {}),
        ...(options.status ? { status: options.status } : {}),
        ...(options.rentalId ? { rentalId: options.rentalId } : {}),
        ...(options.returnId ? { returnId: options.returnId } : {}),
        ...(options.limit !== undefined ? { limit: options.limit } : {}),
        ...(options.cursor ? { cursorCreatedAt: options.cursor.createdAt, cursorId: options.cursor.id } : {}),
      },
    },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new IncidentApiError(response.status);
  return data;
}

/** INC-02 - detalle con timeline append-only. */
export async function getIncident(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<IncidentDetail> {
  const { data, error, response } = await incidentsApiClient.GET('/incidents/{id}', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new IncidentApiError(response.status);
  return data;
}

export interface CreateIncidentInput {
  rentalId: string;
  returnId?: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  suggestion?: string;
}

/** INC-01 - "Registrar incidencia" (POST /incidents, Idempotency-Key). */
export async function createIncident(
  idToken: string,
  companyId: string,
  branchId: string,
  input: CreateIncidentInput,
): Promise<IncidentResponse> {
  const body: CreateBody = {
    companyId,
    branchId,
    rentalId: input.rentalId,
    type: input.type,
    severity: input.severity,
    description: input.description,
    ...(input.returnId ? { returnId: input.returnId } : {}),
    ...(input.suggestion ? { suggestion: input.suggestion } : {}),
  };
  const { data, error, response } = await incidentsApiClient.POST('/incidents', {
    params: { header: { 'Idempotency-Key': crypto.randomUUID() } },
    headers: authHeaders(idToken),
    body,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** INC-02 - agrega una accion al historial (append-only). */
export async function addIncidentAction(
  idToken: string,
  id: string,
  version: number,
  companyId: string,
  branchId: string,
  description: string,
): Promise<IncidentDetail> {
  const body: AddActionBody = { companyId, branchId, description };
  const { data, error, response } = await incidentsApiClient.POST('/incidents/{id}/commands/add-action', {
    params: { path: { id }, header: { 'If-Match': ifMatch(version), 'Idempotency-Key': crypto.randomUUID() } },
    headers: authHeaders(idToken),
    body,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** INC-01 - resolver directo desde la fila (solo LEVE; exige resumen). */
export async function resolveIncident(
  idToken: string,
  id: string,
  version: number,
  companyId: string,
  branchId: string,
  resolutionSummary: string,
): Promise<IncidentDetail> {
  const body: CloseBody = { companyId, branchId, resolutionSummary };
  const { data, error, response } = await incidentsApiClient.POST('/incidents/{id}/commands/resolve', {
    params: { path: { id }, header: { 'If-Match': ifMatch(version), 'Idempotency-Key': crypto.randomUUID() } },
    headers: authHeaders(idToken),
    body,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** INC-02 - "Cerrar incidencia" (exige resumen de resolucion). */
export async function closeIncident(
  idToken: string,
  id: string,
  version: number,
  companyId: string,
  branchId: string,
  resolutionSummary: string,
  decision?: ManagementDecisionOutcome,
): Promise<IncidentDetail> {
  const body: CloseBody = { companyId, branchId, resolutionSummary, ...(decision ? { decision } : {}) };
  const { data, error, response } = await incidentsApiClient.POST('/incidents/{id}/commands/close', {
    params: { path: { id }, header: { 'If-Match': ifMatch(version), 'Idempotency-Key': crypto.randomUUID() } },
    headers: authHeaders(idToken),
    body,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** INC-02 - derivar a vía legal (estado VIA_LEGAL; exige motivo). */
export async function referIncidentToLegal(
  idToken: string,
  id: string,
  version: number,
  companyId: string,
  branchId: string,
  reason: string,
  decision?: ManagementDecisionOutcome,
): Promise<IncidentDetail> {
  const body: ReferLegalBody = { companyId, branchId, reason, ...(decision ? { decision } : {}) };
  const { data, error, response } = await incidentsApiClient.POST('/incidents/{id}/commands/refer-legal', {
    params: { path: { id }, header: { 'If-Match': ifMatch(version), 'Idempotency-Key': crypto.randomUUID() } },
    headers: authHeaders(idToken),
    body,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
