import { HrCommandError } from './hr-client';

/** Codigos de dominio del backend de Administracion de Personal, traducidos a lenguaje de negocio. */
export const VACATION_CONFLICT_MESSAGE =
  'Ya hay una persona de tu área de vacaciones en esas fechas — máximo 1 por área a la vez (BR-ADP-002), tiene prioridad quien solicitó primero';

const DOMAIN_MESSAGES: Record<string, string> = {
  // 404
  EMPLOYEE_NOT_FOUND: 'No encontramos a esta persona en tu empresa y sede.',
  LEAVE_NOT_FOUND: 'No encontramos esa solicitud de permiso.',
  FIELD_TRIP_NOT_FOUND: 'No encontramos esa salida a campo.',
  // 409
  CANDIDATE_ALREADY_EMPLOYEE: 'Este candidato ya fue registrado como personal.',
  DUPLICATE_EMPLOYEE_DOCUMENT: 'Ya existe una persona registrada con ese documento en esta empresa.',
  EMPLOYEE_TERMINATED: 'La relación laboral de esta persona ya terminó: no se pueden registrar nuevos movimientos.',
  EMPLOYMENT_ALREADY_TERMINATED: 'La relación laboral de esta persona ya fue terminada y no se puede registrar de nuevo.',
  ATTENDANCE_ALREADY_LOGGED: 'Ya existe un registro de asistencia de esa persona en esa fecha.',
  LEAVE_ALREADY_RESOLVED: 'Este permiso ya fue resuelto por otra persona. Recargamos los datos.',
  VACATION_OVERLAP: VACATION_CONFLICT_MESSAGE,
  FIELD_TRIP_NOT_PENDING: 'Esta solicitud ya no está esperando autorización. Recargamos los datos.',
  FIELD_TRIP_NOT_AUTHORIZED: 'Solo se puede registrar el regreso de una salida que fue autorizada.',
  FIELD_TRIP_TIMEOUT_NOT_ELAPSED: 'Todavía no vencen los 5 minutos de este nivel. Volveremos a intentarlo.',
  NO_AUTHORIZATION_AVAILABLE: 'Nadie autorizó esta salida. La persona no sale; cualquier otra gestión es manual, fuera del sistema.',
  // 422
  EMPLOYEE_STATUS_TRANSITION_NOT_ALLOWED: 'Ese cambio de relación laboral no está permitido. El término se registra con renuncia o despido.',
  INVALID_TERMINATION_NOTICE: 'El aviso no es válido: una renuncia sin previo aviso es 0 días y un despido por reincidencia es de 15 días.',
  TERMINATION_NOTES_REQUIRED: 'Indica el motivo del despido (al menos unas palabras).',
  FINAL_SETTLEMENT_REQUIRED: 'Para registrar una renuncia debe estar pagada la quincena pendiente.',
  INVALID_ATTENDANCE_RECORD: 'El registro de asistencia no es válido: una tardanza necesita los minutos de tardanza.',
  DEDUCTIONS_BEFORE_MONTH_END: 'Los descuentos se aplican al cerrar el mes: todavía no se puede aplicar.',
  // 400
  INVALID_DATE_RANGE: 'La fecha de inicio debe ser anterior o igual a la fecha de término.',
  INVALID_LEAVE_STATUS: 'La resolución del permiso no es válida: solo se aprueba o se deniega.',
  INVALID_FIELD_TRIP_DATES: 'La hora de retorno debe ser posterior a la hora de salida.',
  INVALID_AUTHORIZATION_LEVEL: 'Nivel de autorización no válido: la cascada tiene exactamente 3 niveles.',
  AUTHORIZATION_LEVEL_NOT_REACHED: 'Esta solicitud todavía no llegó a ese nivel. Recargamos los datos.',
  INVALID_PAYROLL_MONTH: 'El mes indicado no es válido.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos ingresados: alguno no es válido.',
  403: 'No tienes permiso para realizar esta acción en esta empresa o sede.',
  404: 'No encontramos el registro en tu empresa y sede.',
  409: 'Este registro cambió mientras lo editabas. Recargamos los datos; revisa y vuelve a intentar.',
  422: 'La operación no cumple las reglas de negocio vigentes.',
};

/** Un 409 significa que el estado cambio en el servidor: hay que recargar antes de reintentar. */
export function isStaleHrError(error: unknown): boolean {
  return error instanceof HrCommandError && error.status === 409;
}

export function hrErrorCode(error: unknown): string | undefined {
  return error instanceof HrCommandError ? error.problem?.code : undefined;
}

export function describeHrError(error: unknown, fallback: string): string {
  if (error instanceof HrCommandError) {
    const code = error.problem?.code;
    if (code && DOMAIN_MESSAGES[code]) return DOMAIN_MESSAGES[code];
    if (STATUS_MESSAGES[error.status]) return STATUS_MESSAGES[error.status];
  }
  return fallback;
}
