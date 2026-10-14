import type { ReservationCreditResponse } from './rentals-client';

export interface GuaranteeBreakdown {
  total: number;
  credit: number;
  toCollect: number;
  /** Saldo a favor de la reserva cuando supera la garantia (sin reembolso automatico). */
  creditExcess: number;
}

/**
 * La reserva se traslada a la garantia; se cobra la diferencia. Si la reserva supera la garantia
 * (el monto de reserva es un parametro versionado), el cobro es 0.00 y el sobrante queda como
 * saldo a favor de la reserva (sin reembolso automatico).
 */
export function computeGuaranteeBreakdown(
  total: number | null,
  credit: ReservationCreditResponse | null,
): GuaranteeBreakdown {
  const t = total != null && Number.isFinite(total) ? Math.round(total * 100) : 0;
  const c = credit?.applied ? Math.round(parseFloat(credit.creditAmount) * 100) || 0 : 0;
  return {
    total: t / 100,
    credit: Math.min(c, t) / 100,
    toCollect: Math.max(t - c, 0) / 100,
    creditExcess: t > 0 ? Math.max(c - t, 0) / 100 : 0,
  };
}

export function formatPen(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}
