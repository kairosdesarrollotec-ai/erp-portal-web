import { describe, it, expect } from 'vitest';
import {
  addDaysToDateOnly,
  limaEndOfDayInstant,
  formatLimaDate,
  formatLimaDateTime,
  formatLimaDayMonth,
  formatLimaTime,
  limaDateAndTimeToInstant,
  limaDateTimeToInstant,
  limaDateToInstant,
  limaToday,
  toLimaDateOnly,
  toLimaInputValue,
} from './lima-time';

describe('lima-time - enviar al backend', () => {
  it('una fecha sin hora significa 00:00 de Lima (05:00 UTC)', () => {
    expect(limaDateToInstant('2026-10-14')).toBe('2026-10-14T05:00:00.000Z');
    expect(limaDateToInstant('2026-12-31')).toBe('2026-12-31T05:00:00.000Z');
  });

  it('rechaza fechas invalidas', () => {
    expect(limaDateToInstant('14/10/2026')).toBeNull();
    expect(limaDateToInstant('2026-13-40')).toBeNull();
    expect(limaDateToInstant('')).toBeNull();
  });

  it('una hora local sin offset se interpreta como hora de Lima', () => {
    expect(limaDateTimeToInstant('2026-10-14T08:05')).toBe('2026-10-14T13:05:00.000Z');
    expect(limaDateTimeToInstant('2026-10-14T08:05:30')).toBe('2026-10-14T13:05:30.000Z');
  });

  it('borde 22:00-23:59 de Lima cae en el dia siguiente en UTC', () => {
    expect(limaDateTimeToInstant('2026-10-14T22:00')).toBe('2026-10-15T03:00:00.000Z');
    expect(limaDateTimeToInstant('2026-10-14T23:59')).toBe('2026-10-15T04:59:00.000Z');
    expect(limaDateTimeToInstant('2026-12-31T23:30')).toBe('2027-01-01T04:30:00.000Z');
  });

  it('respeta un offset explicito y rechaza basura', () => {
    expect(limaDateTimeToInstant('2026-10-14T13:05:00Z')).toBe('2026-10-14T13:05:00.000Z');
    expect(limaDateTimeToInstant('2026-10-14T08:05:00-05:00')).toBe('2026-10-14T13:05:00.000Z');
    expect(limaDateTimeToInstant('mañana')).toBeNull();
    expect(limaDateTimeToInstant('')).toBeNull();
  });

  it('combina fecha y hora de Lima', () => {
    expect(limaDateAndTimeToInstant('2026-10-14', '23:59')).toBe('2026-10-15T04:59:00.000Z');
  });

  it('suma dias a una fecha sin hora sin tocar zonas', () => {
    expect(addDaysToDateOnly('2026-10-14', 3)).toBe('2026-10-17');
    expect(addDaysToDateOnly('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDaysToDateOnly('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysToDateOnly('x', 1)).toBeNull();
  });
});

describe('lima-time - hoy y entradas', () => {
  it('limaToday: a las 22:00-23:59 de Lima el dia sigue siendo el de Lima (en UTC ya es el siguiente)', () => {
    expect(limaToday(new Date('2026-10-15T03:00:00Z'))).toBe('2026-10-14'); // 22:00 Lima
    expect(limaToday(new Date('2026-10-15T04:59:59Z'))).toBe('2026-10-14'); // 23:59:59 Lima
    expect(limaToday(new Date('2026-10-15T05:00:00Z'))).toBe('2026-10-15'); // 00:00 Lima
    expect(limaToday(new Date('2026-10-14T04:59:59Z'))).toBe('2026-10-13');
  });

  it('toLimaDateOnly convierte instantes y deja pasar fechas sin hora', () => {
    expect(toLimaDateOnly('2026-10-15T04:59:00Z')).toBe('2026-10-14');
    expect(toLimaDateOnly('2026-10-15T05:00:00Z')).toBe('2026-10-15');
    expect(toLimaDateOnly('2026-10-14')).toBe('2026-10-14');
    expect(toLimaDateOnly(null)).toBe('');
    expect(toLimaDateOnly('basura')).toBe('');
  });

  it('toLimaInputValue entrega el valor de un datetime-local en hora de Lima', () => {
    expect(toLimaInputValue('2026-10-15T03:00:00Z')).toBe('2026-10-14T22:00');
    expect(toLimaInputValue(new Date('2026-10-15T04:59:00Z'))).toBe('2026-10-14T23:59');
    expect(toLimaInputValue(undefined)).toBe('');
  });

  it('ida y vuelta: Lima -> instante -> Lima', () => {
    for (const local of ['2026-10-14T00:00', '2026-10-14T22:00', '2026-10-14T23:59', '2026-01-01T00:01']) {
      expect(toLimaInputValue(limaDateTimeToInstant(local))).toBe(local);
    }
  });
});

describe('lima-time - mostrar', () => {
  it('muestra el dia de Lima de un instante UTC (borde 22:00-23:59)', () => {
    expect(formatLimaDate('2026-10-15T03:00:00Z')).toBe('14/10/2026');
    expect(formatLimaDate('2026-10-15T04:59:00Z')).toBe('14/10/2026');
    expect(formatLimaDate('2026-10-15T05:00:00Z')).toBe('15/10/2026');
    expect(formatLimaDate('2027-01-01T04:30:00Z')).toBe('31/12/2026');
  });

  it('una fecha sin hora no se desplaza un dia', () => {
    expect(formatLimaDate('2026-10-14')).toBe('14/10/2026');
    expect(formatLimaDayMonth('2026-10-04')).toBe('04/10');
  });

  it('formatea dia/mes, hora y fecha-hora de Lima', () => {
    expect(formatLimaDayMonth('2026-10-15T03:00:00Z')).toBe('14/10');
    expect(formatLimaTime('2026-10-15T03:00:00Z')).toBe('22:00');
    expect(formatLimaTime('2026-10-15T04:59:00Z')).toBe('23:59');
    expect(formatLimaDateTime('2026-10-15T04:59:00Z')).toBe('14/10/2026 23:59');
    expect(formatLimaDateTime('2026-10-15T05:00:00Z')).toBe('15/10/2026 00:00');
  });

  it('valores vacios o invalidos no revientan', () => {
    expect(formatLimaDate(null)).toBe('—');
    expect(formatLimaDate('nope')).toBe('—');
    expect(formatLimaDateTime(undefined)).toBe('—');
    expect(formatLimaTime('nope')).toBe('—');
    expect(formatLimaDayMonth('nope')).toBe('');
  });
});

describe('limaEndOfDayInstant', () => {
  it('devuelve el ultimo milisegundo del dia de Lima', () => {
    expect(limaEndOfDayInstant('2026-10-14')).toBe('2026-10-15T04:59:59.999Z');
    expect(limaEndOfDayInstant('2026-12-31')).toBe('2027-01-01T04:59:59.999Z');
    expect(limaEndOfDayInstant('nope')).toBeNull();
  });
});
