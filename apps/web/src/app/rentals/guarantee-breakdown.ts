import type { ReservationCreditResponse } from './rentals-client';

export interface GuaranteeBreakdown {
  total: number;
  credit: number;
  toCollect: number;
  exceedsTotal: boolean;
}

/** P0-03 opcion (a): la reserva se traslada integra a la garantia; se cobra la diferencia. */
export function computeGuaranteeBreakdown(
  total: number | null,
  credit: ReservationCreditResponse | null,
): GuaranteeBreakdown {
  const t = total != null && Number.isFinite(total) ? Math.round(total * 100) : 0;
  const c = credit?.applied ? Math.round(parseFloat(credit.creditAmount) * 100) || 0 : 0;
  return {
    total: t / 100,
    credit: c / 100,
    toCollect: Math.max(t - c, 0) / 100,
    exceedsTotal: c > t && t > 0,
  };
}

export function formatPen(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}
