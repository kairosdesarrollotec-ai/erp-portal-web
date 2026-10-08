import type { components } from '../../api/recruitment.generated';

export type VacancySource = components['schemas']['VacancySource'];
export type VacancyStatus = components['schemas']['VacancyStatus'];
export type CandidateStage = components['schemas']['CandidateStage'];
export type CandidateDecision = components['schemas']['CandidateDecision'];
export type InterviewResult = components['schemas']['InterviewResult'];

export const VACANCY_SOURCE_LABEL: Record<VacancySource, string> = {
  RENUNCIA: 'Renuncia',
  CRECIMIENTO: 'Crecimiento',
  NUEVA_AREA: 'Área nueva',
};

export const VACANCY_STATUS_LABEL: Record<VacancyStatus, string> = {
  NECESIDAD_REGISTRADA: 'Necesidad registrada',
  PUBLICADA: 'Publicada',
  EN_NEGOCIACION: 'En negociación',
  DECIDIDA: 'Decidida',
  CANCELADA: 'Cancelada',
};

/** Columnas del tablero REC-03, en orden. Las etapas avanzan, nunca retroceden. */
export const CANDIDATE_STAGES: readonly CandidateStage[] = ['NUEVO', 'CONTACTADO', 'ENTREVISTA', 'DECISION'];

export const CANDIDATE_STAGE_LABEL: Record<CandidateStage, string> = {
  NUEVO: 'Nuevo',
  CONTACTADO: 'Contactado',
  ENTREVISTA: 'Entrevista',
  DECISION: 'Decisión',
};

export const INTERVIEW_RESULT_LABEL: Record<InterviewResult, string> = {
  PENDIENTE: 'Pendiente',
  AVANZA: 'Avanza',
  NO_AVANZA: 'No avanza',
};

export const CANDIDATE_DECISION_LABEL: Record<CandidateDecision, string> = {
  CONTRATADO: 'Contratado',
  RECHAZADO: 'No contratado',
};

/** Canales de publicacion sugeridos (REC-02); el de institutos tecnicos solo aplica a mecanicos (BR-REC-004). */
export const TECHNICAL_CHANNEL = 'Institutos técnicos';
export const PUBLICATION_CHANNELS: readonly string[] = ['Facebook', 'Recomendación', TECHNICAL_CHANNEL];

/** Etapas a las que se puede mover un candidato desde la actual (solo hacia adelante). */
export function nextStages(current: CandidateStage): CandidateStage[] {
  const index = CANDIDATE_STAGES.indexOf(current);
  return CANDIDATE_STAGES.slice(index + 1);
}

/** REC-07: el ingreso se propone para "manana" (YYYY-MM-DD, hora local). */
export function defaultStartDate(now: Date = new Date()): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  return `${tomorrow.getFullYear()}-${mm}-${dd}`;
}

/** REC-08: dias que faltan para cumplir los 3 meses del periodo de prueba (0 si ya se cumplieron). */
export function probationDaysRemaining(startDate: string, now: Date = new Date()): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(start.getFullYear(), start.getMonth() + 3, start.getDate());
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  return Math.max(0, diff);
}
