import { rentalsApiClient } from '../../api/rentals-api-client';
import type { components } from '../../api/rentals.generated';
import { RentalCommandError, RentalApiError } from './rentals-client';

type RequestEvidenceUploadSessionBody = components['schemas']['RequestEvidenceUploadSessionRequest'];
type RecordEvidenceBody = components['schemas']['RecordEvidenceRequest'];

export type RentalEvidenceType = 'PHOTO' | 'VIDEO';
/** rentals.yaml 1.12.0: ALCOHOL_TEST = foto de la prueba de alcoholímetro (ENTREGA-02; solo en VALIDATION; no cuenta para las 35 fotos). */
export type RentalEvidenceZone =
  | 'FRONTAL'
  | 'LATERAL_IZQUIERDO'
  | 'LATERAL_DERECHO'
  | 'POSTERIOR'
  | 'INTERIOR'
  | 'ALCOHOL_TEST';
export type RentalEvidenceContentType = 'image/jpeg' | 'image/webp' | 'video/mp4' | 'video/webm';

export interface EvidenceUploadSessionResponse {
  uploadUrl: string;
  objectUrl: string;
}

export interface RentalEvidenceResponse {
  id: string;
  rentalId: string;
  type: RentalEvidenceType;
  zone: RentalEvidenceZone;
  objectUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export class GcsEvidenceUploadError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function requestEvidenceUploadSession(
  idToken: string,
  rentalId: string,
  companyId: string,
  branchId: string,
  type: RentalEvidenceType,
  zone: RentalEvidenceZone,
  contentType: RentalEvidenceContentType,
  contentLength: number,
): Promise<EvidenceUploadSessionResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/evidence/upload-url', {
    params: {
      path: { id: rentalId },
      header: { 'Idempotency-Key': crypto.randomUUID() },
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, type, zone, contentType, contentLength } as unknown as RequestEvidenceUploadSessionBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as EvidenceUploadSessionResponse;
}

export async function uploadEvidenceToGcs(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!response.ok) {
    throw new GcsEvidenceUploadError(`Error al subir el archivo a GCS (${response.status})`, response.status);
  }
}

export async function recordEvidence(
  idToken: string,
  rentalId: string,
  companyId: string,
  branchId: string,
  type: RentalEvidenceType,
  zone: RentalEvidenceZone,
  objectUrl: string,
): Promise<RentalEvidenceResponse> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/evidence', {
    params: {
      path: { id: rentalId },
      header: { 'Idempotency-Key': crypto.randomUUID() },
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, type, zone, objectUrl } as unknown as RecordEvidenceBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalEvidenceResponse;
}

export async function listRentalEvidence(
  idToken: string,
  rentalId: string,
  companyId: string,
  branchId: string,
): Promise<RentalEvidenceResponse[]> {
  const { data, error, response } = await rentalsApiClient.GET('/rentals/{id}/evidence', {
    params: { path: { id: rentalId }, query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new RentalApiError(response.status);
  }
  return data as unknown as RentalEvidenceResponse[];
}

/** ALQ-09 - elimina una evidencia registrada por error (solo mientras el alquiler esta pendiente de entrega). */
export async function deleteRentalEvidence(
  idToken: string,
  rentalId: string,
  evidenceId: string,
  companyId: string,
  branchId: string,
): Promise<void> {
  const { error, response } = await rentalsApiClient.DELETE('/rentals/{id}/evidence/{evidenceId}', {
    params: { path: { id: rentalId, evidenceId }, query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !response.ok) {
    throw new RentalApiError(response.status);
  }
}

export type RentalDocumentType =
  | 'LICENSE'
  | 'ID_DOCUMENT'
  | 'PROOF_OF_ADDRESS'
  | 'BANK_STATEMENT'
  | 'PAYMENT_VOUCHER'
  | 'RESPONSIBILITY_DOCUMENT'
  | 'OTHER';
export type RentalDocumentContentType = 'image/jpeg' | 'image/webp' | 'image/png' | 'application/pdf';

export interface RentalDocumentRecord {
  id: string;
  rentalId: string;
  documentType: RentalDocumentType;
  objectUrl: string;
  createdAt: string;
}

export async function requestRentalDocumentUploadSession(
  idToken: string,
  rentalId: string,
  companyId: string,
  branchId: string,
  documentType: RentalDocumentType,
  contentType: RentalDocumentContentType,
  contentLength: number,
): Promise<{ uploadUrl: string; objectUrl: string }> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/documents/upload-url', {
    params: { path: { id: rentalId } },
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, documentType, contentType, contentLength } as never,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as { uploadUrl: string; objectUrl: string };
}

export async function uploadFileToGcs(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new GcsEvidenceUploadError(`Error al subir el archivo a GCS (${res.status})`, res.status);
  }
}

export async function recordRentalDocument(
  idToken: string,
  rentalId: string,
  companyId: string,
  branchId: string,
  documentType: RentalDocumentType,
  objectUrl: string,
): Promise<RentalDocumentRecord> {
  const { data, error, response } = await rentalsApiClient.POST('/rentals/{id}/documents', {
    params: { path: { id: rentalId } },
    headers: { Authorization: `Bearer ${idToken}`, 'Idempotency-Key': crypto.randomUUID() },
    body: { companyId, branchId, documentType, objectUrl } as never,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new RentalCommandError(response.status, problem);
  }
  return data as unknown as RentalDocumentRecord;
}

export async function listRentalDocuments(
  idToken: string,
  rentalId: string,
  companyId: string,
  branchId: string,
): Promise<RentalDocumentRecord[]> {
  const { data, error, response } = await rentalsApiClient.GET('/rentals/{id}/documents', {
    params: { path: { id: rentalId }, query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new RentalApiError(response.status);
  }
  return data as unknown as RentalDocumentRecord[];
}
