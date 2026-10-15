import { formatLimaDate, formatLimaDateTime, formatLimaTime } from '../shared/lima-time';

/** Formatos de fecha para las pantallas ADP (es-PE, siempre en hora de Lima: DEC-TZ-LIMA-001). */
export function formatDateTime(value: string): string {
  return formatLimaDateTime(value);
}

/** Acepta `YYYY-MM-DD` (fecha sin hora: dia calendario, no se desplaza) o un instante ISO (se muestra en Lima). */
export function formatDate(value: string): string {
  return formatLimaDate(value);
}

/** Solo la hora (HH:mm) de un instante ISO, en hora de Lima. */
export function formatTime(value: string): string {
  return formatLimaTime(value);
}
