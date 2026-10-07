import { CheckCircle2, CircleDot, Scale } from 'lucide-react';
import {
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  type IncidentSeverity,
  type IncidentStatus,
} from './incident-domain';
import styles from './IncidentBadges.module.css';

/** Severidad: Leve #2F6B4F, Moderada #8A5505, Grave #C22B2B (UX/UI v3.1 §5.8 INC-01 + incidents.yaml v0.1.0). */
export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <span className={`${styles.badge} ${styles[`severity_${severity}`]}`} data-severity={severity}>
      {INCIDENT_SEVERITY_LABELS[severity]}
    </span>
  );
}

/**
 * Estado distinguible sin depender del color: icono + texto + trazo.
 * Abierta: destacada (negrita, borde solido, punto). Cerrada y Via legal:
 * atenuadas (check / balanza, sin relleno).
 */
export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const Icon = status === 'ABIERTA' ? CircleDot : status === 'CERRADA' ? CheckCircle2 : Scale;
  return (
    <span className={`${styles.status} ${styles[`status_${status}`]}`} data-status={status}>
      <Icon size={14} aria-hidden="true" />
      {INCIDENT_STATUS_LABELS[status]}
    </span>
  );
}
