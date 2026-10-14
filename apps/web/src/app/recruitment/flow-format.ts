import { formatLimaDate, formatLimaDateTime } from '../shared/lima-time';

/** Formatos de fecha para las pantallas REC-05..REC-08 (es-PE). */
export function formatDateTime(value: string): string {
  return formatLimaDateTime(value);
}

/** Acepta `YYYY-MM-DD` (fecha sin hora, no se desplaza) o un instante ISO (se muestra en hora de Lima). */
export function formatDate(value: string): string {
  return formatLimaDate(value);
}
