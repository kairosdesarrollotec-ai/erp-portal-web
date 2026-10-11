import { rentalsApiClient } from '../../api/rentals-api-client';
import { RentalCommandError } from './rentals-client';
import type { RentalResponse } from './rentals-client';

// Re-export so callers that import from this module get the shared error class.
export { RentalCommandError };

// --- UC-ALQ-006 / BR-ALQ-012 - Ciclo de vida de ampliaciones de alquiler ---

/** Solicitar ampliacion de alquiler. */
export async function requestExtension(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  requestedEndAt: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/request-extension', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, requestedEndAt } as never,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/** Autorizar ampliacion de alquiler (solo Gerencia). */
export async function authorizeExtension(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  paymentId?: string,
  addendumDocumentRef?: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/authorize-extension', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, paymentId, addendumDocumentRef } as never,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/** Rechazar ampliacion de alquiler. */
export async function rejectExtension(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/reject-extension', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId } as never,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}

/** Reportar falta grave de ampliacion — retiene 100% fianza y marca cliente Rojo (BR-ALQ-013). */
export async function reportExtensionBreach(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  notes?: string,
): Promise<RentalResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/commands/report-extension-breach', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, notes } as never,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}
