import { describe, it, expect } from 'vitest';
import { computeGuaranteeBreakdown } from './guarantee-breakdown';

const credit = (amount: string, applied = true) => ({
  reservationId: 'r', applied, reason: applied ? 'APPLIED' : 'RESERVATION_NOT_ACTIVE', creditAmount: amount, currency: 'PEN',
});

describe('computeGuaranteeBreakdown', () => {
  it('reserva estandar S/300 sobre S/1000', () => {
    expect(computeGuaranteeBreakdown(1000, credit('300.00'))).toEqual({ total: 1000, credit: 300, toCollect: 700, exceedsTotal: false });
  });
  it('alquiler directo sin credito', () => {
    expect(computeGuaranteeBreakdown(1000, null)).toEqual({ total: 1000, credit: 0, toCollect: 1000, exceedsTotal: false });
  });
  it('credito no aplicado (cancelada) cobra todo', () => {
    expect(computeGuaranteeBreakdown(1000, credit('300.00', false)).toCollect).toBe(1000);
  });
  it('monto no estandar', () => {
    expect(computeGuaranteeBreakdown(1000, credit('450.00')).toCollect).toBe(550);
  });
  it('credito mayor que la garantia', () => {
    expect(computeGuaranteeBreakdown(200, credit('300.00')).exceedsTotal).toBe(true);
  });
  it('sin monto digitado', () => {
    expect(computeGuaranteeBreakdown(null, credit('300.00')).exceedsTotal).toBe(false);
  });
});
