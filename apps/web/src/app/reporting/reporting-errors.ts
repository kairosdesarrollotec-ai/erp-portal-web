/**
 * REP-01 — Errores de la API de Reportes (reporting.yaml 0.3.0).
 * Cuerpo de error: `{ statusCode, code, detail }`; códigos de fechas: INVALID_DATE,
 * INVALID_DATE_RANGE, RANGE_EXCEEDS_MAX (HTTP 400).
 */
import { MAX_RANGE_DAYS } from './reporting-range';

export const REPORTING_DATE_ERROR_MESSAGES: Record<string, string> = {
  INVALID_DATE: 'Alguna de las fechas no es válida. Revisa el rango e inténtalo de nuevo.',
  INVALID_DATE_RANGE: 'La fecha de inicio debe ser anterior o igual a la fecha de fin.',
  RANGE_EXCEEDS_MAX: `El rango máximo permitido es ${MAX_RANGE_DAYS} días (BR-REP-005).`,
};

export class ReportingApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ReportingApiError';
    this.status = status;
    this.code = code;
  }
}

/** Construye el error de la API a partir del cuerpo `{code, detail}` (si lo hay). */
export function toReportingApiError(fallbackMessage: string, status: number, body: unknown): ReportingApiError {
  const code =
    body && typeof body === 'object' && typeof (body as { code?: unknown }).code === 'string'
      ? (body as { code: string }).code
      : undefined;
  return new ReportingApiError(fallbackMessage, status, code);
}

/** Mensaje en español para errores de fechas conocidos; `null` si no aplica (se usa el texto genérico). */
export function reportingDateErrorMessage(error: unknown): string | null {
  if (!(error instanceof ReportingApiError) || !error.code) return null;
  return REPORTING_DATE_ERROR_MESSAGES[error.code] ?? null;
}
