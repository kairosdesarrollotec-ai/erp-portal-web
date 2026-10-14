import { describe, it, expect } from 'vitest';
import { latenessLabel } from './return-lateness';

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
