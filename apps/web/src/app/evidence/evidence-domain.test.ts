import { describe, expect, it } from 'vitest';
import { EvidenceDeletionError } from './evidence-client';
import { describeEvidenceError, isOpenRequest, isStaleEvidenceError, targetHref } from './evidence-domain';
import { filterByTab } from './useEvidenceDeletionRequests';
import { makeDeletionRequest } from './evidence-test-utils';

describe('evidence-domain', () => {
  it('traduce los códigos de dominio a lenguaje de negocio', () => {
    const e = new EvidenceDeletionError(403, { code: 'EVIDENCE_DELETION_SELF_APPROVAL', detail: 'x' });
    expect(describeEvidenceError(e, 'fallback')).toMatch(/otra persona/);
    expect(describeEvidenceError(new EvidenceDeletionError(403, { code: 'EVIDENCE_DELETION_SAME_APPROVER', detail: 'x' }), 'f')).toMatch(/distinta/);
    expect(describeEvidenceError(new EvidenceDeletionError(500, null), 'fallback')).toBe('fallback');
    expect(describeEvidenceError(new Error('x'), 'fallback')).toBe('fallback');
  });

  it('409 y 404 piden recargar', () => {
    expect(isStaleEvidenceError(new EvidenceDeletionError(409, null))).toBe(true);
    expect(isStaleEvidenceError(new EvidenceDeletionError(403, null))).toBe(false);
  });

  it('solo PENDING y APPROVED_1 son solicitudes abiertas', () => {
    expect(isOpenRequest({ status: 'PENDING' })).toBe(true);
    expect(isOpenRequest({ status: 'APPROVED_1' })).toBe(true);
    expect(isOpenRequest({ status: 'EXECUTED' })).toBe(false);
    expect(isOpenRequest({ status: 'EXPIRED' })).toBe(false);
  });

  it('enlaza al expediente correcto', () => {
    expect(targetHref({ targetKind: 'RENTAL', targetId: 'r1' })).toBe('/alquileres/r1/entrega-04');
    expect(targetHref({ targetKind: 'RETURN', targetId: 'd1' })).toBe('/devoluciones/d1/checklist');
  });

  it('filtra por pestaña: pendientes de mi decisión / mías / todas', () => {
    const mine = makeDeletionRequest({ id: 'a', requestedBy: 'me', viewer: { canApprove: false, canReject: false } });
    const toDecide = makeDeletionRequest({ id: 'b', viewer: { canApprove: true, canReject: true } });
    const done = makeDeletionRequest({ id: 'c', status: 'EXECUTED', viewer: { canApprove: false, canReject: false } });
    const all = [mine, toDecide, done];
    expect(filterByTab(all, 'PENDING_MINE', 'me').map((r) => r.id)).toEqual(['b']);
    expect(filterByTab(all, 'MINE', 'me').map((r) => r.id)).toEqual(['a']);
    expect(filterByTab(all, 'ALL', 'me')).toHaveLength(3);
    expect(filterByTab(all, 'MINE', null)).toHaveLength(0);
  });
});
