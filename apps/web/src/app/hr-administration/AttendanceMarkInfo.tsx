import type { AttendanceRecord } from './hr-client';
import { mapLink } from './geofence';
import styles from './HrFlow.module.css';

const REVIEW_LABEL = { PENDING: 'Revisión pendiente', APPROVED: 'Revisión aprobada', CORRECTED: 'Corregida en la revisión' } as const;

/** Detalle de la marca (P-ADP-08, 22-oct #9): ubicacion, dentro/fuera de la geocerca, revision y origen (propia / a nombre de). */
export function AttendanceMarkInfo({ record }: { record: AttendanceRecord }) {
  const hasLocation = record.latitude != null && record.longitude != null;
  const review = record.reviewStatus ? REVIEW_LABEL[record.reviewStatus] : null;
  if (!hasLocation && !record.outsideGeofence && !review && record.source !== 'ON_BEHALF') return null;
  return (
    <span className={styles.markInfo} data-testid="attendance-mark-info">
      {record.source === 'ON_BEHALF' && <span title={record.onBehalfReason ?? undefined}>A nombre de la persona{record.onBehalfReason ? `: ${record.onBehalfReason}` : ''}</span>}
      {record.outsideGeofence && (
        <strong>
          Fuera de la geocerca{record.distanceMeters != null ? ` (a ${Math.round(record.distanceMeters)} m` : ''}
          {record.distanceMeters != null && record.geofenceRadiusMeters != null ? ` de ${record.geofenceRadiusMeters} m permitidos)` : record.distanceMeters != null ? ')' : ''}
        </strong>
      )}
      {review && <span>{review}{record.reviewNote ? `: ${record.reviewNote}` : ''}</span>}
      {hasLocation && (
        <a href={mapLink(record.latitude!, record.longitude!)} target="_blank" rel="noopener noreferrer">
          Ver ubicación en el mapa
        </a>
      )}
    </span>
  );
}
