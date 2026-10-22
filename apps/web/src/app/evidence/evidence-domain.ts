import { EvidenceDeletionError, type EvidenceDeletionRequest, type EvidenceDeletionStatus } from './evidence-client';

export const MIN_REASON_LENGTH = 5;
export const MAX_REASON_LENGTH = 500;

/** Estados "abiertos": la evidencia sigue existiendo y la solicitud aun puede avanzar. */
export const OPEN_STATUSES: readonly EvidenceDeletionStatus[] = ['PENDING', 'APPROVED_1'];

export const STATUS_LABELS: Record<EvidenceDeletionStatus, string> = {
  PENDING: 'Pendiente de 1.ª aprobación',
  APPROVED_1: 'Falta la 2.ª aprobación',
  EXECUTED: 'Eliminada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Vencida',
};

export const TARGET_LABELS = { RENTAL: 'Entrega de alquiler', RETURN: 'Recepción de devolución' } as const;

export function isOpenRequest(request: Pick<EvidenceDeletionRequest, 'status'>): boolean {
  return OPEN_STATUSES.includes(request.status);
}

export function targetHref(request: Pick<EvidenceDeletionRequest, 'targetKind' | 'targetId'>): string {
  return request.targetKind === 'RENTAL'
    ? `/alquileres/${request.targetId}/entrega-04`
    : `/devoluciones/${request.targetId}/checklist`;
}

const DOMAIN_MESSAGES: Record<string, string> = {
  EVIDENCE_DELETION_REASON_REQUIRED: `Escribe un motivo de entre ${MIN_REASON_LENGTH} y ${MAX_REASON_LENGTH} caracteres.`,
  EVIDENCE_DELETION_ALREADY_REQUESTED: 'Ya existe una solicitud abierta para esta evidencia. Revisa la bandeja de solicitudes.',
  EVIDENCE_DELETION_SELF_APPROVAL: 'No puedes aprobar ni rechazar una solicitud que tú mismo hiciste: lo debe hacer otra persona.',
  EVIDENCE_DELETION_SAME_APPROVER: 'Ya diste la primera aprobación. La segunda debe darla una persona distinta.',
  EVIDENCE_DELETION_INVALID_STATE: 'La solicitud ya no está abierta (otra persona la resolvió). Actualizamos la lista.',
  EVIDENCE_DELETION_REQUEST_EXPIRED: 'La solicitud venció sin completarse. Si aún hace falta, solicítala de nuevo.',
  EVIDENCE_DELETION_REQUEST_NOT_FOUND: 'No encontramos la solicitud. Actualizamos la lista.',
  ROLE_NOT_ALLOWED: 'Tu rol no tiene permiso para esta acción. Pide a Administración que revise la matriz de permisos.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos ingresados: alguno no es válido.',
  403: 'No tienes permiso para realizar esta acción en esta empresa o sede.',
  404: 'No encontramos la evidencia o la solicitud en tu empresa y sede.',
  409: 'El expediente ya no admite eliminar evidencia o la solicitud cambió. Actualizamos la información.',
};

export function describeEvidenceError(error: unknown, fallback: string): string {
  if (error instanceof EvidenceDeletionError) {
    const code = error.problem?.code;
    if (code && DOMAIN_MESSAGES[code]) return DOMAIN_MESSAGES[code];
    if (STATUS_MESSAGES[error.status]) return STATUS_MESSAGES[error.status];
  }
  return fallback;
}

/** 409 / 404: la solicitud cambio en el servidor y conviene recargar la lista. */
export function isStaleEvidenceError(error: unknown): boolean {
  return error instanceof EvidenceDeletionError && (error.status === 409 || error.status === 404);
}
