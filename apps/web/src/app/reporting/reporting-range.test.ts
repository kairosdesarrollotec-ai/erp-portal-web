import { describe, it, expect } from 'vitest';
import { MAX_RANGE_DAYS, formatPeriodLabel, validateReportRange } from './reporting-range';

describe('validateReportRange (BR-REP-005, reporting 0.4.0)', () => {
  it('acepta el mismo día (rango inclusivo de un día)', () => {
    expect(validateReportRange('2026-10-11', '2026-10-11')).toBeNull();
  });

  it('acepta exactamente 90 días calendario inclusivos (diferencia 89)', () => {
    expect(MAX_RANGE_DAYS).toBe(90);
    expect(validateReportRange('2026-01-01', '2026-03-31')).toBeNull();
  });

  it('rechaza 91 días inclusivos (diferencia 90) con el mensaje de rango máximo', () => {
    expect(validateReportRange('2026-01-01', '2026-04-01')).toMatch(/rango máximo permitido es 90 días/i);
  });

  it('rechaza inicio posterior al fin', () => {
    expect(validateReportRange('2026-10-12', '2026-10-11')).toMatch(/anterior o igual/i);
  });

  it('pide ambas fechas cuando falta alguna', () => {
    expect(validateReportRange('', '2026-10-11')).toMatch(/selecciona/i);
    expect(validateReportRange('2026-10-11', '')).toMatch(/selecciona/i);
  });

  it.each([['2026-02-30', '2026-03-01'], ['2026-13-01', '2026-13-02'], ['abc', '2026-03-01']])(
    'rechaza fechas inexistentes o ilegibles (%s → %s)',
    (from, to) => {
      expect(validateReportRange(from, to)).toBe('Fechas inválidas.');
    },
  );

  it('el límite se mide en días calendario (no cambia por el cambio de mes/año)', () => {
    expect(validateReportRange('2025-12-01', '2026-02-28')).toBeNull(); // 90 días
    expect(validateReportRange('2025-12-01', '2026-03-01')).not.toBeNull(); // 91 días
  });
});

describe('formatPeriodLabel', () => {
  it('formatea dd/mm/aaaa sin desplazar el día', () => {
    expect(formatPeriodLabel('2026-10-01', '2026-10-11')).toBe('01/10/2026 al 11/10/2026');
  });
});
