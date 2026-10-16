/**
 * REP-01 — Rango de fechas de Reportes (reporting.yaml 0.3.0, BR-REP-005, DEC-TZ-LIMA-001).
 *
 * `dateFrom`/`dateTo` son días de calendario de America/Lima (`YYYY-MM-DD`) y el rango es
 * INCLUSIVO en ambos extremos: "Hasta" incluye el día completo (hasta 23:59:59 Lima).
 * Máximo 90 días entre una fecha y otra (mismo día = 0; +90 aceptado; +91 rechazado), igual
 * que el backend (RANGE_EXCEEDS_MAX).
 */
import { formatLimaDate } from '../shared/lima-time';

export const MAX_RANGE_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Milisegundos UTC del día calendario `YYYY-MM-DD`, o `null` si no existe (p. ej. 2026-02-30). */
function dayNumber(value: string): number | null {
  const m = DATE_ONLY_RE.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return t;
}

/** Devuelve el mensaje de error (en español) o `null` si el rango es válido. */
export function validateReportRange(from: string, to: string): string | null {
  if (!from || !to) return 'Selecciona la fecha de inicio y la fecha de fin.';
  const a = dayNumber(from);
  const b = dayNumber(to);
  if (a === null || b === null) return 'Fechas inválidas.';
  if (a > b) return 'La fecha de inicio debe ser anterior o igual a la fecha de fin.';
  if (Math.round((b - a) / DAY_MS) > MAX_RANGE_DAYS) {
    return `El rango máximo permitido es ${MAX_RANGE_DAYS} días (BR-REP-005).`;
  }
  return null;
}

/** "01/10/2026 al 11/10/2026" para el período aplicado (ambos días incluidos). */
export function formatPeriodLabel(from: string, to: string): string {
  return `${formatLimaDate(from)} al ${formatLimaDate(to)}`;
}
