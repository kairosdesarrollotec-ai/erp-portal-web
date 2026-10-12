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
  CANDIDATE_NOT_CONTRACTED: 'Primero hay que decidir contratar al candidato para poder incorporarlo.',
  ONBOARDING_CHECKLIST_INCOMPLETE:
    'Completa todo el checklist de incorporación: inducción, dispositivos asignados y responsabilidad firmada.',
  ONBOARDING_NOTARIZED_CONTRACT_REQUIRED: 'Un puesto de mecánico siempre requiere el contrato notariado.',
  ONBOARDING_NOT_FOUND: 'Este colaborador todavía no tiene incorporación registrada.',
  VACANCY_NOT_PAUSABLE: 'Solo se puede pausar una vacante publicada o en negociación, y reanudar una pausada.',
  CANDIDATE_CV_INVALID_FILE: 'El CV debe ser PDF, Word (docx), JPG o PNG, de máximo 10 MB.',
  CANDIDATE_CV_OBJECT_MISMATCH: 'El archivo subido no corresponde a este candidato. Vuelve a subirlo.',
  CANDIDATE_CV_NOT_UPLOADED: 'No encontramos el archivo en el almacenamiento. Vuelve a subirlo.',
  CANDIDATE_CV_NOT_FOUND: 'Este candidato todavía no tiene CV cargado.',
  CV_UPLOAD_FAILED: 'No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo.',
  NEGOTIATION_INVALID: 'Revisa la negociación: el acuerdo requiere sueldo acordado y el cierre sin acuerdo requiere motivo.',
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
