import type { LatenessTier, ReturnLateness, ReturnLatenessCharge } from './returns-types';

/** BR-DEV-003: etiqueta informativa solo si hay retraso fuera de tolerancia (sin cobro). */
export function latenessLabel(lateness: ReturnLateness | null | undefined): string | null {
  if (!lateness || !lateness.isLate) return null;
  return `Retraso: ${lateness.lateMinutes} min (tolerancia ${lateness.lateToleranceMinutes} min)`;
}


export const LATENESS_TIER_LABELS: Record<LatenessTier, string> = {
  NONE: 'Dentro de tolerancia',
  EXTRA_31_120: 'Retraso de 31 a 120 min',
  EXTRA_121_300: 'Retraso de 121 min a 5 h',
  EXTRA_OVER_300: 'Retraso de más de 5 h',
};

/** El cargo sugerido solo se muestra si hay retraso fuera de tolerancia o incumplimiento grave. */
export function hasLatenessCharge(charge: ReturnLatenessCharge | null | undefined): charge is ReturnLatenessCharge {
  return !!charge && (charge.tier !== 'NONE' || charge.severeBreach);
}

/** Etiqueta corta para la fila de la bandeja. */
export function latenessChargeBadge(charge: ReturnLatenessCharge | null | undefined): string | null {
  if (!hasLatenessCharge(charge)) return null;
  if (charge.severeBreach) return `Incumplimiento grave (> ${charge.severeBreachThresholdHours} h)`;
  return `Cargo sugerido: ${charge.timeChargePercent}% de la tarifa`;
}

/** Monto decimal (string) -> "S/ 1,000.00" / "USD 10.00"; null si no hay monto. */
export function formatChargeAmount(amount: string | null | undefined, currency: string | null | undefined): string | null {
  if (amount == null) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  const cur = currency ?? 'PEN';
  const text = n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur === 'PEN' ? `S/ ${text}` : `${cur} ${text}`;
}
