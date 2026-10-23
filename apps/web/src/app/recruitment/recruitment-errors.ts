import { RecruitmentCommandError } from './recruitment-client';

/** Codigos de dominio del backend de Reclutamiento, traducidos a lenguaje de negocio. */
const DOMAIN_MESSAGES: Record<string, string> = {
  VERSION_CONFLICT: 'Otra persona modificó este registro. Recargamos los datos; revisa y vuelve a intentar.',
  VACANCY_NOT_TRANSITIONABLE: 'La vacante no puede pasar a ese estado desde el actual.',
  MECHANIC_TECHNICAL_CHANNELS_REQUIRED:
    'Una vacante de mecánico debe publicarse también en institutos técnicos.',
  CANDIDATE_ALREADY_DECIDED: 'Este candidato ya tiene una decisión de contratación y no se puede cambiar.',
  CANDIDATE_DOCUMENT_DUPLICATE: 'Ya existe un candidato con ese documento en esta vacante.',
  CANDIDATE_STAGE_REGRESSION: 'Un candidato solo avanza de etapa; no puede volver a una anterior.',
  CANDIDATE_STATE_TRANSITION_INVALID:
    'Ese paso no corresponde al estado actual del candidato. Para contratar, primero registra el resultado de la entrevista; para incorporar, primero contrata; para evaluar la prueba, primero incorpora.',
  CANDIDATE_NOT_CONTRACTED: 'Primero hay que decidir contratar al candidato para poder incorporarlo.',
  ONBOARDING_CHECKLIST_INCOMPLETE:
    'Completa todo el checklist de incorporación: inducción, dispositivos asignados y responsabilidad firmada.',
  ONBOARDING_NOTARIZED_CONTRACT_REQUIRED: 'Un puesto de mecánico siempre requiere el contrato notariado.',
  ONBOARDING_NOT_FOUND: 'Este colaborador todavía no tiene incorporación registrada.',
  VACANCY_NOT_PAUSABLE: 'Solo se puede pausar una vacante publicada o en negociación, y reanudar una pausada.',
  VACANCY_CANCEL_REASON_REQUIRED: 'Indica el motivo de la cancelación (al menos 5 caracteres).',
  VACANCY_NOT_CANCELLABLE: 'Esta vacante ya no se puede cancelar en su estado actual. Recargamos los datos.',
  VACANCY_AREA_NOT_FOUND: 'El área elegida no existe o no está activa en el catálogo de áreas. Elige una de la lista.',
  CANDIDATE_CV_INVALID_FILE: 'El CV debe ser PDF, Word (docx), JPG o PNG, de máximo 10 MB.',
  CANDIDATE_CV_OBJECT_MISMATCH: 'El archivo subido no corresponde a este candidato. Vuelve a subirlo.',
  CANDIDATE_CV_NOT_UPLOADED: 'No encontramos el archivo en el almacenamiento. Vuelve a subirlo.',
  CANDIDATE_CV_NOT_FOUND: 'Este candidato todavía no tiene CV cargado.',
  CV_UPLOAD_FAILED: 'No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo.',
  NEGOTIATION_INVALID: 'Revisa la negociación: el acuerdo requiere sueldo acordado y el cierre sin acuerdo requiere motivo.',
  ONBOARDING_ALREADY_COMPLETED: 'Esta persona ya fue incorporada: el ingreso no se puede registrar de nuevo. Recargamos los datos.',
  DECISION_REASON_REQUIRED: 'Indica el motivo del descarte: es obligatorio cuando se rechaza a un candidato que ya fue entrevistado.',
  GERENCIA_DECISION_REQUIRED: 'Esta decisión solo la toma Gerencia General («No avanza» tras la entrevista o término por prueba negativa).',
  ROLE_NOT_ALLOWED: 'Tu rol no puede ver o registrar este dato.',
  PROBATION_ALREADY_EVALUATED: 'El periodo de prueba ya fue evaluado.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos ingresados: alguno no es válido.',
  403: 'No tienes permiso para realizar esta acción en esta empresa o sede.',
  404: 'No encontramos el registro en tu empresa y sede.',
  409: 'Este registro cambió mientras lo editabas. Recargamos los datos; revisa y vuelve a intentar.',
  422: 'La operación no cumple las reglas de negocio vigentes.',
  428: 'No pudimos validar la versión del registro. Recarga la pantalla.',
};

/** 409 (VERSION_CONFLICT) o 428: hay que recargar el registro antes de reintentar. */
export function isStaleRecruitmentError(error: unknown): boolean {
  return error instanceof RecruitmentCommandError && (error.status === 409 || error.status === 428);
}

export function describeRecruitmentError(error: unknown, fallback: string): string {
  if (error instanceof RecruitmentCommandError) {
    const code = error.problem?.code;
    if (code && DOMAIN_MESSAGES[code]) return DOMAIN_MESSAGES[code];
    if (STATUS_MESSAGES[error.status]) return STATUS_MESSAGES[error.status];
  }
  return fallback;
}
