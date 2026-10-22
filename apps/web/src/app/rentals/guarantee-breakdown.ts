import type { ReservationCreditResponse } from './rentals-client';

export interface GuaranteeBreakdown {
  total: number;
  credit: number;
  toCollect: number;
}

/**
 * La reserva se traslada a la garantia; se cobra la diferencia. Decision 22-oct: la reserva nunca supera la
 * garantia (el backend rechaza con 422 RESERVATION_EXCEEDS_GUARANTEE) y no existe saldo a favor; por seguridad
 * el traslado se acota a la garantia y el cobro nunca es negativo.
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
  };
}

export function formatPen(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}
