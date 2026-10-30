import { ReturnCommandError } from './returns-client';

/**
 * Codigos de dominio del backend (returns/domain/return-errors.ts) y de
 * SDD-DEV-001 seccion 12.1, traducidos a lenguaje de negocio (nunca se
 * muestra el codigo tecnico ni el status HTTP al usuario).
 */
const DOMAIN_MESSAGES: Record<string, string> = {
  // Tolerancia: el backend ya no responde error ante un alcolimetro desfavorable (es 200), pero
  // si llegara este codigo se explica igual en lenguaje de negocio.
  ALCOHOL_TEST_DISAPPROVAL:
    'La prueba de alcohol no fue favorable. El vehículo queda en recepción provisional bajo custodia de VeloxRent y se deriva a Gerencia.',
  ALCOHOL_TEST_PHOTO_REQUIRED:
    'Un alcoholímetro desfavorable exige la foto de la prueba. Adjúntala y vuelve a registrar el resultado.',
  INVALID_LATE_CHARGE:
    'No se pudo registrar el cargo por retraso: el monto debe ser mayor que cero y la devolución debe haber superado la tolerancia de 30 minutos.',
  RETURN_IDENTITY_REQUIRED:
    'La verificación de identidad de quien entrega el vehículo es obligatoria antes de completar la recepción provisional.',
  MISSING_RESPONSIBILITY_DOCUMENT:
    'Falta el documento de responsabilidad firmado. Complétalo en el checklist de recepción antes de cerrar la inspección.',
  MISSING_REQUIRED_EVIDENCE: 'Falta evidencia obligatoria (fotos o videos). Completa el checklist antes de continuar.',
  INCIDENT_STILL_OPEN:
    'La garantía no se puede liberar ni la devolución cerrar mientras haya una incidencia o evaluación de daño abierta. Resuélvela primero.',
  TECHNICAL_DAMAGE_REQUIRES_EXTERNAL_REPORT:
    'Todo daño técnico requiere la referencia del informe de Motrix. No existe un precio fijo para daños técnicos.',
  TECHNICAL_DAMAGE_NO_FIXED_PRICE:
    'Los daños técnicos no tienen precio fijo. Deriva el vehículo a Motrix y registra el monto de su informe.',
  UNKNOWN_COSMETIC_ZONE: 'El paño elegido no está en el tarifario oficial de daños estéticos.',
  IMMOBILIZATION_PERIOD_NOT_ELAPSED:
    'Aún no corresponde cobrar paralización: no han pasado 24 horas desde el cierre de la devolución.',
  RENTAL_ALREADY_HAS_ACTIVE_RETURN: 'Este alquiler ya tiene una devolución en curso. Búscala en la bandeja de devoluciones.',
  RENTAL_NOT_RETURNABLE:
    'No se puede iniciar la devolución: el alquiler no está activo o tiene una ampliación pendiente (autorízala o recházala primero).',
  RETURN_VERSION_CONFLICT: 'Otra persona modificó esta devolución. Recargamos los datos; revisa y vuelve a intentar.',
  RETURN_STATE_CONFLICT: 'Esta acción ya no corresponde al estado actual de la devolución. Recargamos los datos.',
  DEPOSIT_ALREADY_SETTLED: 'La garantía de este alquiler ya fue liquidada (por ejemplo, retenida por una falta grave). No hay monto que devolver al cliente.',
  INVALID_RETURN_STATE_TRANSITION: 'Esta acción ya no corresponde al estado actual de la devolución. Recargamos los datos.',
  RETURN_SCOPE_FORBIDDEN: 'Esta devolución pertenece a otra empresa o sede y no puedes operarla desde tu contexto de trabajo.',
  RETURN_REMINDER_NOT_FOUND: 'Esta devolución todavía no tiene un recordatorio generado.',
  RETURN_REMINDER_ALREADY_SENT: 'Este recordatorio ya fue registrado como enviado. Recargamos la bandeja.',
  RETURN_REMINDER_VERSION_CONFLICT: 'Otra persona actualizó este recordatorio. Recargamos la bandeja; revisa y vuelve a intentar.',
  INVALID_RETURN_REMINDER_RESULT:
    'Si el envío falló, indica el motivo en la nota. La hora de envío no puede estar en el futuro.',
  RETURN_NO_DEPOSIT_TO_SETTLE:
    'Sin garantía (conductor de la empresa): no hay garantía que liberar ni retener. Continúa al cierre sin montos de garantía.',
  RETURN_NOT_FOUND: 'No encontramos esta devolución en tu empresa y sede.',
  ROLE_NOT_ALLOWED: 'Tu rol no tiene permiso para realizar esta acción.',
  CUSTOMER_BLOCKED: 'El cliente está bloqueado (semáforo rojo) y no puede realizar nuevas operaciones.',
  MECHANIC_REPORT_NOT_ACCEPTED:
    'El cierre requiere que el cliente acepte el informe del taller mecánico/Motrix debido a los daños registrados.',
  RETURN_OFFLINE_CHANGES_PENDING:
    'Hay cambios pendientes de sincronización local. Espera a que se sincronicen antes de cerrar el expediente.',
  ACTIVE_INCIDENTS_BLOCK_CLOSE:
    'No se puede cerrar la devolución mientras existan incidencias técnicas activas sin monto evaluado.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos ingresados: alguno no es válido.',
  403: 'No tienes permiso para realizar esta acción en esta empresa o sede.',
  404: 'No encontramos el registro en tu empresa y sede.',
  409: 'Esta acción ya no corresponde al estado actual de la devolución. Recargamos los datos.',
  412: 'Otra persona modificó esta devolución. Recargamos los datos; revisa y vuelve a intentar.',
  422: 'La operación no cumple las reglas de negocio vigentes.',
  428: 'No pudimos validar la versión del expediente. Recarga la pantalla.',
  503: 'El almacenamiento de archivos no está disponible en este momento (no es un problema de tu conexión). Avisa a soporte.',
};

/** INCIDENT_STILL_OPEN (HTTP 422; se tolera 409 por compatibilidad): estado BLOCKED de DEV-09/DEV-10. */
export function isIncidentOpenError(error: unknown): boolean {
  return error instanceof ReturnCommandError && (error.problem?.code === 'INCIDENT_STILL_OPEN' || error.problem?.code === 'ACTIVE_INCIDENTS_BLOCK_CLOSE');
}

export function isMechanicReportNotAcceptedError(error: unknown): boolean {
  return error instanceof ReturnCommandError && error.problem?.code === 'MECHANIC_REPORT_NOT_ACCEPTED';
}

export function isOfflineChangesPendingError(error: unknown): boolean {
  return error instanceof ReturnCommandError && error.problem?.code === 'RETURN_OFFLINE_CHANGES_PENDING';
}

/** True si el error indica que el expediente cambio y hay que recargarlo. */
export function isStaleReturnError(error: unknown): boolean {
  return (
    error instanceof ReturnCommandError &&
    (error.status === 412 || error.status === 409 || error.status === 428) &&
    !isIncidentOpenError(error)
  );
}

export function describeReturnError(error: unknown, fallback: string): string {
  if (error instanceof ReturnCommandError) {
    const code = error.problem?.code;
    if (code && DOMAIN_MESSAGES[code]) return DOMAIN_MESSAGES[code];
    if (STATUS_MESSAGES[error.status]) return STATUS_MESSAGES[error.status];
  }
  return fallback;
}
