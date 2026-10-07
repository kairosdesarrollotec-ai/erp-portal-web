import type { components } from '../../api/incidents.generated';

/** Catalogos del contrato incidents.yaml (erp-api-local/packages/contracts/openapi). */
export type IncidentType = components['schemas']['IncidentType'];
export type IncidentSeverity = components['schemas']['IncidentSeverity'];
export type IncidentStatus = components['schemas']['IncidentStatus'];
export type IncidentActionKind = components['schemas']['IncidentActionEntry']['kind'];

export const INCIDENT_TYPES: readonly IncidentType[] = [
  'KEY_LOSS',
  'CRASH_OR_DAMAGE',
  'TRAFFIC_FINE_OR_INTERVENTION',
  'TOWING',
  'OTHER',
];
export const INCIDENT_SEVERITIES: readonly IncidentSeverity[] = ['LEVE', 'MODERADA', 'GRAVE'];
export const INCIDENT_STATUSES: readonly IncidentStatus[] = ['ABIERTA', 'CERRADA', 'VIA_LEGAL'];

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  KEY_LOSS: 'Pérdida de llave',
  CRASH_OR_DAMAGE: 'Choque o daño',
  TRAFFIC_FINE_OR_INTERVENTION: 'Papeleta o intervención',
  TOWING: 'Remolque',
  OTHER: 'Otro',
};

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  LEVE: 'Leve',
  MODERADA: 'Moderada',
  GRAVE: 'Grave',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  ABIERTA: 'Abierta',
  CERRADA: 'Cerrada',
  VIA_LEGAL: 'Vía legal',
};

export const INCIDENT_ACTION_LABELS: Record<IncidentActionKind, string> = {
  REPORTED: 'Incidencia reportada',
  ACTION: 'Acción tomada',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
  REFERRED_LEGAL: 'Derivada a vía legal',
};

export const MAX_TEXT_LENGTH = 2000;

/**
 * INC-01: "Resolver" directo en la fila SOLO para severidad LEVE y estado
 * ABIERTA (UX/UI v3.1 §5.8 INC-01 criterio 14 + incidents.yaml v0.1.0).
 */
export function canResolveDirect(incident: { severity: IncidentSeverity; status: IncidentStatus }): boolean {
  return incident.severity === 'LEVE' && incident.status === 'ABIERTA';
}

/** Codigo legible del expediente: `rentalCode` del backend o, si falta, un id abreviado. */
export function rentalLabel(incident: { rentalId: string; rentalCode?: string | null }): string {
  return incident.rentalCode ?? `Alquiler ${incident.rentalId.slice(0, 8)}`;
}

/** El contrato solo expone el UUID del responsable (sin nombre): se muestra abreviado. */
export function shortUserId(userId: string): string {
  return userId.slice(0, 8);
}
