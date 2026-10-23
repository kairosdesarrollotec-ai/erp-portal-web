import type { EvidenceDeletionRequest } from './evidence-client';

/** Fixture de pruebas (no se importa desde codigo de produccion). */
export function makeDeletionRequest(overrides: Partial<EvidenceDeletionRequest> = {}): EvidenceDeletionRequest {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    companyId: 'c1',
    branchId: 'b1',
    targetKind: 'RENTAL',
    targetId: 'aaaaaaaa-1111-4111-8111-111111111111',
    evidenceId: 'ev-1',
    evidence: { type: 'PHOTO', zone: 'FRONTAL', uploadedBy: 'uid-op', uploadedAt: '2026-10-22T10:00:00Z' },
    reason: 'Foto tomada del vehículo equivocado',
    status: 'PENDING',
    requestedBy: 'uid-op',
    requestedAt: '2026-10-22T10:05:00Z',
    firstApprovedBy: null,
    firstApprovedAt: null,
    firstApprovalNote: null,
    secondApprovedBy: null,
    secondApprovedAt: null,
    secondApprovalNote: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    executedAt: null,
    expiredAt: null,
    expiresAt: '2026-10-29T10:05:00Z',
    version: 1,
    viewer: { canApprove: true, canReject: true },
    ...overrides,
  };
}
