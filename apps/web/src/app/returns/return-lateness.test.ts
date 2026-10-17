import { describe, it, expect } from 'vitest';
import { latenessLabel, hasLatenessCharge, latenessChargeBadge, formatChargeAmount } from './return-lateness';
import type { ReturnLatenessCharge } from './returns-types';

const charge = (over: Partial<ReturnLatenessCharge> = {}): ReturnLatenessCharge => ({
  tier: 'EXTRA_31_120', basis: 'RECEIVED', informational: true, timeChargePercent: 25, guaranteePenaltyPercent: 20,
  dailyRate: '200.00', guaranteeAmount: '1000.00', currency: 'PEN', suggestedTimeCharge: '50.00', suggestedGuaranteePenalty: '200.00',
  noticeAndPrepaymentVerified: false, severeBreach: false, severeBreachThresholdHours: 12, ...over,
});

describe('latenessLabel', () => {
  it('null/undefined/no tardio no muestran etiqueta', () => {
    expect(latenessLabel(null)).toBeNull();
    expect(latenessLabel(undefined)).toBeNull();
    expect(latenessLabel({ lateToleranceMinutes: 30, lateMinutes: 12, isLate: false, basis: 'RECEIVED' })).toBeNull();
  });
  it('tardio muestra minutos y tolerancia', () => {
    expect(latenessLabel({ lateToleranceMinutes: 30, lateMinutes: 41, isLate: true, basis: 'RECEIVED' })).toBe('Retraso: 41 min (tolerancia 30 min)');
  });
});

describe('cargo sugerido por retraso (DEC-DEV-LATE-CHARGE-001)', () => {
  it('solo aplica con tramo distinto de NONE o incumplimiento grave', () => {
    expect(hasLatenessCharge(null)).toBe(false);
    expect(hasLatenessCharge(charge({ tier: 'NONE' }))).toBe(false);
    expect(hasLatenessCharge(charge({ tier: 'NONE', severeBreach: true }))).toBe(true);
    expect(hasLatenessCharge(charge())).toBe(true);
  });
  it('etiqueta de la bandeja', () => {
    expect(latenessChargeBadge(charge())).toBe('Cargo sugerido: 25% de la tarifa');
    expect(latenessChargeBadge(charge({ tier: 'EXTRA_OVER_300', severeBreach: true }))).toBe('Incumplimiento grave (> 12 h)');
    expect(latenessChargeBadge(charge({ tier: 'NONE' }))).toBeNull();
  });
  it('formatea montos decimales y tolera null', () => {
    expect(formatChargeAmount('1000', 'PEN')).toBe('S/ 1,000.00');
    expect(formatChargeAmount('10.5', 'USD')).toBe('USD 10.50');
    expect(formatChargeAmount(null, 'PEN')).toBeNull();
  });
});
