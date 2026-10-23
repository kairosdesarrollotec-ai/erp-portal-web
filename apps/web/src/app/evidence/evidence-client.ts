import { evidenceApiClient } from '../../api/evidence-api-client';
import type { components } from '../../api/evidence.generated';

/**
 * Cliente de evidence.yaml 1.0.0 (DEC-EVID-DELETE-002): eliminar evidencia exige DOBLE APROBACION.
 * Solicitar -> PENDING; aprobar -> APPROVED_1; aprobar de nuevo (otra persona) -> EXECUTED; rechazar -> REJECTED.
 */
export type EvidenceDeletionRequest = components['schemas']['EvidenceDeletionRequest'];
export type EvidenceDeletionStatus = components['schemas']['EvidenceDeletionStatus'];
export type EvidenceDeletionTargetKind = components['schemas']['EvidenceDeletionTargetKind'];

/** Cuerpo `{ statusCode, code, detail }` que el backend devuelve en 4xx. */
export class EvidenceDeletionError extends Error {
  readonly name = 'EvidenceDeletionError';
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operación sobre la evidencia no se pudo completar (${status})`);
  }
}

function toError(error: unknown, response: Response): EvidenceDeletionError {
  const problem = (error as { code?: string; detail?: string } | null | undefined) ?? null;
  return new EvidenceDeletionError(response.status, problem && typeof problem === 'object' ? problem : null);
}

const bearer = (idToken: string) => ({ Authorization: `Bearer ${idToken}` });

export interface ListDeletionRequestsParams {
  companyId: string;
  branchId: string;
  status?: EvidenceDeletionStatus;
  targetKind?: EvidenceDeletionTargetKind;
  limit?: number;
}

/** GET /evidence/deletion-requests (estado EFECTIVO; mas recientes primero). */
export async function listEvidenceDeletionRequests(
  idToken: string,
  params: ListDeletionRequestsParams,
): Promise<EvidenceDeletionRequest[]> {
  const { data, error, response } = await evidenceApiClient.GET('/evidence/deletion-requests', {
    params: { query: params },
    headers: bearer(idToken),
  });
  if (error || !data) throw toError(error, response);
  return data;
}

export interface RequestEvidenceDeletionInput {
  companyId: string;
  branchId: string;
  targetKind: EvidenceDeletionTargetKind;
  targetId: string;
  evidenceId: string;
  reason: string;
}

/** POST /evidence/deletion-requests (motivo obligatorio, 5-500 caracteres). No borra nada todavia. */
export async function requestEvidenceDeletion(
  idToken: string,
  body: RequestEvidenceDeletionInput,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<EvidenceDeletionRequest> {
  const { data, error, response } = await evidenceApiClient.POST('/evidence/deletion-requests', {
    params: { header: { 'Idempotency-Key': idempotencyKey } },
    headers: bearer(idToken),
    body,
  });
  if (error || !data) throw toError(error, response);
  return data;
}

/** POST /evidence/deletion-requests/{id}/approve (1.a -> APPROVED_1; 2.a, otra persona -> EXECUTED). */
export async function approveEvidenceDeletion(
  idToken: string,
  id: string,
  body: { companyId: string; branchId: string; note?: string },
  idempotencyKey: string = crypto.randomUUID(),
): Promise<EvidenceDeletionRequest> {
  const { data, error, response } = await evidenceApiClient.POST('/evidence/deletion-requests/{id}/approve', {
    params: { path: { id }, header: { 'Idempotency-Key': idempotencyKey } },
    headers: bearer(idToken),
    body,
  });
  if (error || !data) throw toError(error, response);
  return data;
}

/** POST /evidence/deletion-requests/{id}/reject (motivo obligatorio). La evidencia no se toca. */
export async function rejectEvidenceDeletion(
  idToken: string,
  id: string,
  body: { companyId: string; branchId: string; reason: string },
  idempotencyKey: string = crypto.randomUUID(),
): Promise<EvidenceDeletionRequest> {
  const { data, error, response } = await evidenceApiClient.POST('/evidence/deletion-requests/{id}/reject', {
    params: { path: { id }, header: { 'Idempotency-Key': idempotencyKey } },
    headers: bearer(idToken),
    body,
  });
  if (error || !data) throw toError(error, response);
  return data;
}
