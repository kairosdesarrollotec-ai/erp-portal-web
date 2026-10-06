import { IncidentCommandError } from './incidents-client';

/** Codigos de dominio de incidents.yaml, traducidos a lenguaje de negocio. */
const DOMAIN_MESSAGES: Record<string, string> = {
  VERSION_CONFLICT: 'Otra persona modificó esta incidencia. Recargamos los datos; revisa y vuelve a intentar.',
  INCIDENT_NOT_OPEN: 'Esta incidencia ya no está abierta, por lo que no admite más cambios. Recargamos los datos.',
  INCIDENT_DIRECT_RESOLVE_NOT_ALLOWED:
    'Solo las incidencias leves se pueden resolver desde la bandeja. Abre el detalle para revisarla y cerrarla.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos ingresados: alguno no es válido.',
  403: 'No tienes permiso para realizar esta acción en esta empresa o sede.',
  404: 'No encontramos la incidencia o el alquiler en tu empresa y sede.',
  409: 'Esta incidencia cambió mientras la editabas. Recargamos los datos; revisa y vuelve a intentar.',
  422: 'La operación no cumple las reglas de negocio vigentes.',
  428: 'No pudimos validar la versión de la incidencia. Recarga la pantalla.',
};

/** 409 (VERSION_CONFLICT / INCIDENT_NOT_OPEN) o 428: hay que recargar la incidencia. */
export function isStaleIncidentError(error: unknown): boolean {
  return error instanceof IncidentCommandError && (error.status === 409 || error.status === 428);
}

export function describeIncidentError(error: unknown, fallback: string): string {
  if (error instanceof IncidentCommandError) {
    const code = error.problem?.code;
    if (code && DOMAIN_MESSAGES[code]) return DOMAIN_MESSAGES[code];
    if (STATUS_MESSAGES[error.status]) return STATUS_MESSAGES[error.status];
  }
  return fallback;
}
