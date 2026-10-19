import type { components } from '../../api/recruitment.generated';
import { addDaysToDateOnly, limaDateToInstant, limaToday } from '../shared/lima-time';

export type VacancySource = components['schemas']['VacancySource'];
export type VacancyStatus = components['schemas']['VacancyStatus'];
export type CandidateStage = components['schemas']['CandidateStage'];
export type CandidateProcessState = components['schemas']['CandidateProcessState'];
export type CandidateDecision = components['schemas']['CandidateDecision'];
export type InterviewResult = components['schemas']['InterviewResult'];
export type NegotiationOutcome = components['schemas']['NegotiationOutcome'];

export const NEGOTIATION_OUTCOME_LABEL: Record<NegotiationOutcome, string> = {
  EN_CURSO: 'En curso',
  ACORDADA: 'Acordada',
  NO_ACORDADA: 'No acordada',
};

/** Tipos y tope del CV (espejo de la validacion del backend; alli se vuelve a validar). */
export const CV_MAX_BYTES = 10 * 1024 * 1024;
export const CV_ACCEPTED_TYPES: readonly string[] = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

export const VACANCY_SOURCE_LABEL: Record<VacancySource, string> = {
  RENUNCIA: 'Renuncia',
  CRECIMIENTO: 'Crecimiento',
  NUEVA_AREA: 'Área nueva',
};

export const VACANCY_STATUS_LABEL: Record<VacancyStatus, string> = {
  NECESIDAD_REGISTRADA: 'Necesidad registrada',
  PUBLICADA: 'Publicada',
  EN_NEGOCIACION: 'En negociación',
  ENTREVISTADA: 'Entrevistada',
  DECIDIDA: 'Decidida',
  CANCELADA: 'Cancelada',
  PAUSADA: 'Pausada',
};

/** BDD-REC §11.6 - estado normativo del candidato (distinto de la etapa Kanban). */
export const PROCESS_STATE_LABEL: Record<CandidateProcessState, string> = {
  EN_NEGOCIACION: 'En negociación',
  ENTREVISTADO: 'Entrevistado',
  DECIDIDO: 'Decidido',
  DESCARTADO: 'Descartado',
  INGRESADO: 'Ingresado',
  PERIODO_PRUEBA: 'Periodo de prueba',
  PLANILLA: 'Planilla',
  TERMINADO: 'Terminado',
};

/**
 * Pasos del flujo BDD-REC §11.6, en orden. Los dos primeros son de la vacante (Necesidad registrada, Publicado):
 * un candidato siempre nace con la vacante ya publicada, así que se muestran como completados.
 */
export const PROCESS_FLOW_STEPS: readonly { key: string; label: string }[] = [
  { key: 'NECESIDAD', label: 'Necesidad registrada' },
  { key: 'PUBLICADO', label: 'Publicado' },
  { key: 'EN_NEGOCIACION', label: 'En negociación' },
  { key: 'ENTREVISTADO', label: 'Entrevistado' },
  { key: 'DECIDIDO', label: 'Decidido' },
  { key: 'INGRESADO', label: 'Ingresado' },
  { key: 'PERIODO_PRUEBA', label: 'Periodo de prueba' },
  { key: 'PLANILLA', label: 'Planilla' },
];

const FLOW_INDEX: Record<string, number> = Object.fromEntries(PROCESS_FLOW_STEPS.map((step, index) => [step.key, index]));

/**
 * Índice del último paso alcanzado. Los estados que salen del camino principal (Descartado, Terminado) se
 * ubican donde ocurrió la salida: Terminado sale de Periodo de prueba; Descartado sale de En negociación o, si
 * ya hubo una entrevista registrada, de Decidido (BDD-REC §11.6: "Decidido -> Descartado").
 */
export function processFlowPosition(state: CandidateProcessState, hadInterview = false): number {
  if (state === 'TERMINADO') return FLOW_INDEX.PERIODO_PRUEBA;
  if (state === 'DESCARTADO') return hadInterview ? FLOW_INDEX.DECIDIDO : FLOW_INDEX.EN_NEGOCIACION;
  return FLOW_INDEX[state];
}

/**
 * BDD-REC §11.6: "Decidido" solo se alcanza desde "Entrevistado", así que contratar exige haber registrado la
 * entrevista. Descartar (no contratar) sí es posible también desde "En negociación".
 */
export const canHire = (state: CandidateProcessState) => state === 'ENTREVISTADO';

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

/** REC-07: el ingreso se propone para "manana" (YYYY-MM-DD, dia de Lima). */
export function defaultStartDate(now: Date = new Date()): string {
  return addDaysToDateOnly(limaToday(now), 1) ?? limaToday(now);
}

/** REC-08: dias que faltan para cumplir los 3 meses del periodo de prueba (0 si ya se cumplieron). */
export function probationDaysRemaining(startDate: string, now: Date = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate);
  if (!match) return 0;
  // Fin del periodo de prueba: 3 meses calendario despues, a las 00:00 de Lima.
  const endDay = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + 3, Number(match[3])));
  const endDate = `${endDay.getUTCFullYear()}-${String(endDay.getUTCMonth() + 1).padStart(2, '0')}-${String(endDay.getUTCDate()).padStart(2, '0')}`;
  const end = limaDateToInstant(endDate);
  if (!end) return 0;
  const diff = Math.ceil((new Date(end).getTime() - now.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

/** Valida el archivo del CV antes de pedir la subida; null = valido. */
export function validateCvFile(file: { type: string; size: number }): string | null {
  if (!CV_ACCEPTED_TYPES.includes(file.type)) return 'El CV debe ser PDF, Word (docx), JPG o PNG.';
  if (file.size <= 0) return 'El archivo está vacío.';
  if (file.size > CV_MAX_BYTES) return 'El CV supera el máximo de 10 MB.';
  return null;
}
