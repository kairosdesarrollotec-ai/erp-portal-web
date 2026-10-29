export type RentalStatus =
  | 'DRAFT'
  | 'VALIDATION'
  | 'NOTARY_EVALUATION'
  | 'CONTRACTING'
  | 'PENDING_DELIVERY'
  | 'ACTIVE'
  | 'EXTENSION_PENDING'
  | 'RETURN_IN_PROGRESS'
  | 'CLOSED'
  | 'CANCELLED';

export type NotaryResult = 'MANDATORY' | 'DOUBLE_DEPOSIT' | 'THIRD_PATH_ELIGIBLE' | 'MANUAL_REVIEW';

export type AlcoholTestResult = 'FAVORABLE' | 'DESFAVORABLE' | 'RECHAZADO';

/** PANTALLAS-V3-B-ALQUILER.md ALQ-01 - badges de la bandeja. */
export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  DRAFT: 'Borrador',
  VALIDATION: 'Entrega — Etapa 1 de 5',
  NOTARY_EVALUATION: 'Entrega — Etapa 3 de 5',
  CONTRACTING: 'Entrega — Etapa 3 de 5',
  PENDING_DELIVERY: 'Entrega — Etapa 4 de 5',
  ACTIVE: 'Activo',
  EXTENSION_PENDING: 'Activo',
  RETURN_IN_PROGRESS: 'Devolución',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
};

/**
 * Mapea el estado de dominio del backend a la etapa (1-5) del asistente de
 * Entrega, para el indicador de avance y el boton "Continuar" de ALQ-01.
 * ALQ-01/ENTREGA-01..05 (PANTALLAS-V3-B-ALQUILER.md).
 */
export function rentalStageForStatus(status: RentalStatus): 1 | 2 | 3 | 4 | 5 | null {
  switch (status) {
    case 'DRAFT':
      return 1;
    case 'VALIDATION':
      return 2;
    case 'NOTARY_EVALUATION':
    case 'CONTRACTING':
      return 3;
    case 'PENDING_DELIVERY':
      return 4;
    default:
      return null;
  }
}

export function rentalWizardPathForStatus(id: string, status: RentalStatus): string {
  const stage = rentalStageForStatus(status) ?? 5;
  return `/alquileres/${id}/entrega-0${stage}`;
}

/** Resultado de la matriz notarial (BR-ALQ-003/004) en español para el personal. */
export const NOTARY_RESULT_LABELS: Record<string, string> = {
  MANDATORY: 'Notaría obligatoria',
  DOUBLE_DEPOSIT: 'Doble depósito de garantía',
  THIRD_PATH_ELIGIBLE: 'Elegible para tercera vía (requiere aprobación de Gerencia)',
  MANUAL_REVIEW: 'Revisión manual requerida (Gerencia)',
};

export const ALCOHOL_RESULT_LABELS: Record<string, string> = {
  FAVORABLE: 'Favorable',
  DESFAVORABLE: 'Desfavorable',
  RECHAZADO: 'Rechazado',
};

export const RENTAL_PLAN_LABELS: Record<string, string> = {
  NORMAL: 'Normal',
  PLUS: 'Plus',
  LIBRE: 'Libre (km libre)',
};

export const EXTENSION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente de decisión',
  AUTHORIZED: 'Autorizada',
  REJECTED: 'Rechazada',
};
