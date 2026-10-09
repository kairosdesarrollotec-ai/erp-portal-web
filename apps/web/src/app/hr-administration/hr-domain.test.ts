import { describe, it, expect } from 'vitest';
import {
  absenceNumberInMonth,
  findVacationConflict,
  formatCountdown,
  formatSoles,
  isMonthClosing,
  noticeDaysBetween,
  pendingLevel,
  previewReturn,
  remainingSeconds,
  shiftMonth,
  yearsOfRange,
} from './hr-domain';

describe('hr-domain', () => {
  it('formatea soles y la cuenta regresiva', () => {
    expect(formatSoles(45)).toBe('S/ 45.00');
    expect(formatCountdown(252)).toBe('04:12');
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('calcula segundos restantes sin bajar de cero', () => {
    const now = new Date('2026-10-05T10:00:00Z').getTime();
    expect(remainingSeconds('2026-10-05T10:04:12Z', now)).toBe(252);
    expect(remainingSeconds('2026-10-05T09:59:00Z', now)).toBe(0);
  });

  it('el nivel pendiente solo existe en 1, 2 o 3', () => {
    expect(pendingLevel('PENDIENTE_NIVEL_1')).toBe(1);
    expect(pendingLevel('PENDIENTE_NIVEL_3')).toBe(3);
    expect(pendingLevel('NO_AUTORIZADA')).toBeNull();
    expect(pendingLevel('AUTORIZADA')).toBeNull();
  });

  it('BR-ADP-005: 1ª a 3ª tardanza es advertencia y la 4ª pasa a observado', () => {
    const est = '2026-10-05T17:00:00Z';
    expect(previewReturn(0, est, '2026-10-05T17:00:00Z').isLate).toBe(false);
    expect(previewReturn(2, est, '2026-10-05T17:45:00Z')).toMatchObject({ isLate: true, lateMinutes: 45, lateNumber: 3, willBeObserved: false });
    expect(previewReturn(3, est, '2026-10-05T17:10:00Z')).toMatchObject({ lateNumber: 4, willBeObserved: true });
  });

  it('BR-ADP-002: detecta la vacacion activa de otra persona que se superpone (gana quien pidio primero)', () => {
    const base = { areaId: 'OP', requestedAt: '2026-09-01T00:00:00Z' };
    const existing = [
      { ...base, employeeId: 'e2', startDate: '2026-10-10', endDate: '2026-10-15', status: 'PROGRAMADA' as const },
      { ...base, employeeId: 'e3', startDate: '2026-10-12', endDate: '2026-10-20', status: 'CANCELADA' as const },
      { ...base, employeeId: 'e1', startDate: '2026-10-12', endDate: '2026-10-20', status: 'PROGRAMADA' as const },
    ];
    expect(findVacationConflict(existing, 'e1', { startDate: '2026-10-14', endDate: '2026-10-18' })?.employeeId).toBe('e2');
    expect(findVacationConflict(existing, 'e1', { startDate: '2026-10-16', endDate: '2026-10-18' })).toBeNull();
  });

  it('los descuentos se pueden aplicar solo desde el ultimo dia del mes', () => {
    expect(isMonthClosing('2026-10', new Date(2026, 9, 30))).toBe(false);
    expect(isMonthClosing('2026-10', new Date(2026, 9, 31))).toBe(true);
    expect(isMonthClosing('2026-09', new Date(2026, 9, 2))).toBe(true);
  });

  it('numera la falta dentro del mes', () => {
    const records = [
      { status: 'FALTA_INJUSTIFICADA' as const, date: '2026-10-02' },
      { status: 'PRESENTE' as const, date: '2026-10-03' },
      { status: 'FALTA_INJUSTIFICADA' as const, date: '2026-09-30' },
    ];
    expect(absenceNumberInMonth(records, '2026-10-06')).toBe(2);
  });

  it('meses, anios y dias de aviso', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(yearsOfRange({ startDate: '2026-12-28', endDate: '2027-01-05' })).toEqual([2026, 2027]);
    expect(noticeDaysBetween('2026-10-01', '2026-10-16')).toBe(15);
    expect(noticeDaysBetween('', '2026-10-16')).toBe(0);
  });
});
