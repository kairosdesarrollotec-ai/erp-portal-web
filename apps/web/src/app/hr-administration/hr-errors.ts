import { HrCommandError } from './hr-client';

/** Codigos de dominio del backend de Administracion de Personal, traducidos a lenguaje de negocio. */
export const VACATION_CONFLICT_MESSAGE =
  'Ya hay una persona de tu área de vacaciones en esas fechas — máximo 1 por área a la vez (BR-ADP-002), tiene prioridad quien solicitó primero';

const DOMAIN_MESSAGES: Record<string, string> = {
  EMPLOYEE_NOT_FOUND: 'No encontramos a esta persona en tu empresa y sede.',
  DUPLICATE_EMPLOYEE_DOCUMENT: 'Ya existe una persona registrada con ese documento en esta empresa.',
  EMPLOYMENT_ALREADY_TERMINATED: 'La relación laboral de esta persona ya fue terminada y no se puede registrar de nuevo.',
  VACATION_OVERLAP: VACATION_CONFLICT_MESSAGE,
  INVALID_DATE_RANGE: 'La fecha de inicio debe ser anterior o igual a la fecha de término.',
  LEAVE_ALREADY_RESOLVED: 'Este permiso ya fue resuelto por otra persona. Recargamos los datos.',
  FIELD_TRIP_NOT_PENDING: 'Esta solicitud ya no está esperando autorización. Recargamos los datos.',
  FIELD_TRIP_NOT_AUTHORIZED: 'Solo se puede registrar el regreso de una salida que fue autorizada.',
  INVALID_AUTHORIZATION_LEVEL: 'Nivel de autorización no válido: la cascada tiene exactamente 3 niveles.',
  NO_AUTHORIZATION_AVAILABLE: 'Nadie autorizó esta salida. La persona no sale; cualquier otra gestión es manual, fuera del sistema.',
  ATTENDANCE_ALREADY_LOGGED: 'Ya existe un registro de asistencia de esa persona en esa fecha.',
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
