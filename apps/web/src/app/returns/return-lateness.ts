import type { ReturnLateness } from './returns-types';

/** BR-DEV-003: etiqueta informativa solo si hay retraso fuera de tolerancia (sin cobro). */
export function latenessLabel(lateness: ReturnLateness | null | undefined): string | null {
  if (!lateness || !lateness.isLate) return null;
  return `Retraso: ${lateness.lateMinutes} min (tolerancia ${lateness.lateToleranceMinutes} min)`;
}
