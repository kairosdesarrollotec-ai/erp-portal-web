import { returnsApiClient } from '../../api/returns-api-client';
import { ReturnApiError, ReturnCommandError } from './returns-client';
import type {
  ReturnEvidenceContentType,
  ReturnEvidenceResponse,
  ReturnEvidenceType,
  ReturnEvidenceUploadSession,
} from './returns-types';

// Re-export so callers that import from this module get the shared error classes.
export { ReturnApiError, ReturnCommandError };

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

function commandHeaders(idToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${idToken}`,
    'Idempotency-Key': crypto.randomUUID(),
  };
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
    params: { path: { id } } as unknown as never,
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
    params: { path: { id } } as unknown as never,
    headers: commandHeaders(idToken),
    body: { companyId, branchId, type, zone, objectUrl } as unknown as never,
  });
  if (error || !data) {
    throw new ReturnCommandError(response.status, (error as unknown as { code?: string; detail?: string } | null) ?? null);
  }
  return data as unknown as ReturnEvidenceResponse;
}

/** DEV-04 - elimina una evidencia de recepcion registrada por error. */
export async function deleteReturnEvidence(
  idToken: string,
  id: string,
  evidenceId: string,
  companyId: string,
  branchId: string,
): Promise<void> {
  const { error, response } = await returnsApiClient.DELETE('/returns/{id}/evidence/{evidenceId}', {
    params: { path: { id, evidenceId }, query: { companyId, branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !response.ok) throw new ReturnApiError(response.status);
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
