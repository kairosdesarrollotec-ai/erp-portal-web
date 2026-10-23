import { rentalsApiClient } from '../../api/rentals-api-client';
import { RentalCommandError } from './rentals-client';
import type { RentalResponse } from './rentals-client';

/** DEC-ALQ-CANCEL-001 (22-oct): motivos de cancelacion manual antes de la entrega. OTHER exige nota (min. 10 caracteres). */
export const RENTAL_CANCEL_REASONS = ['DOCUMENTS_INVALID', 'CUSTOMER_REJECTED_NOTARY', 'OTHER'] as const;
export type RentalCancelReason = (typeof RENTAL_CANCEL_REASONS)[number];

export const RENTAL_CANCEL_REASON_LABELS: Record<RentalCancelReason, string> = {
  DOCUMENTS_INVALID: 'Documentos inválidos',
  CUSTOMER_REJECTED_NOTARY: 'El cliente rechaza la notaría',
  OTHER: 'Otro motivo',
};

type RawPost = (
  path: string,
  init: unknown,
) => Promise<{ data?: unknown; error?: unknown; response: Response }>;

/**
 * POST /rentals/{id}/commands/cancel (rentals.yaml, DEC-ALQ-CANCEL-001). Estados cancelables: DRAFT, VALIDATION,
 * NOTARY_EVALUATION, CONTRACTING y PENDING_DELIVERY. Libera el compromiso del vehiculo. Permiso RENTAL.CANCEL.
 */
export async function cancelRental(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
  version: number,
  reason: RentalCancelReason,
  note?: string,
): Promise<RentalResponse> {
  const post = (rentalsApiClient as unknown as { POST: RawPost }).POST;
  const { data, error, response } = await post.call(rentalsApiClient, '/rentals/{id}/commands/cancel', {
    params: { path: { id }, header: { 'If-Match': `"${version}"` } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, reason, ...(note?.trim() ? { note: note.trim() } : {}) },
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalResponse;
}
