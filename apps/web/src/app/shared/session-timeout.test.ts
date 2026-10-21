import { describe, it, expect } from 'vitest';
import {
  ABSOLUTE_LIMIT_MS,
  evaluateSession,
  idleLimitMs,
  IDLE_LIMIT_GENERAL_MS,
  IDLE_LIMIT_PRIVILEGED_MS,
} from './session-timeout';

const MIN = 60_000;
const T0 = 1_800_000_000_000;

describe('session-timeout (SEC-F3, TDD-00 8.4)', () => {
  it('usa los valores aprobados: 30 min general, 15 min privilegiados, 8 h absoluta', () => {
    expect(IDLE_LIMIT_GENERAL_MS).toBe(30 * MIN);
    expect(IDLE_LIMIT_PRIVILEGED_MS).toBe(15 * MIN);
    expect(ABSOLUTE_LIMIT_MS).toBe(8 * 60 * MIN);
  });

  it.each(['GERENCIA', 'FINANZAS', 'RRHH'])('%s es privilegiado (15 min)', (key) => {
    expect(idleLimitMs({ key })).toBe(15 * MIN);
  });

  it('roles no privilegiados y roles a medida (key null) usan 30 min', () => {
    expect(idleLimitMs({ key: 'FRONT_OFFICE' })).toBe(30 * MIN);
    expect(idleLimitMs({ key: null })).toBe(30 * MIN);
  });

  it('rol aun desconocido aplica el limite estricto (falla cerrado)', () => {
    expect(idleLimitMs(null)).toBe(15 * MIN);
  });

  it('un rol general sigue activo a los 29 min y expira a los 30', () => {
    const base = { lastActivityAt: T0, signedInAt: T0, role: { key: 'FRONT_OFFICE' } };
    expect(evaluateSession({ ...base, now: T0 + 29 * MIN })).toBe('ACTIVE');
    expect(evaluateSession({ ...base, now: T0 + 30 * MIN })).toBe('IDLE_EXPIRED');
  });

  it('un rol privilegiado expira a los 15 min de inactividad', () => {
    const base = { lastActivityAt: T0, signedInAt: T0, role: { key: 'GERENCIA' } };
    expect(evaluateSession({ ...base, now: T0 + 14 * MIN })).toBe('ACTIVE');
    expect(evaluateSession({ ...base, now: T0 + 15 * MIN })).toBe('IDLE_EXPIRED');
  });

  it('expira a las 8 h aunque haya actividad reciente', () => {
    const now = T0 + 8 * 60 * MIN;
    expect(evaluateSession({ now, lastActivityAt: now - 1000, signedInAt: T0, role: { key: 'FRONT_OFFICE' } })).toBe(
      'ABSOLUTE_EXPIRED',
    );
    expect(
      evaluateSession({ now: now - 1, lastActivityAt: now - 1000, signedInAt: T0, role: { key: 'FRONT_OFFICE' } }),
    ).toBe('ACTIVE');
  });

  it('sin hora de inicio conocida solo aplica la inactividad', () => {
    expect(evaluateSession({ now: T0 + 40 * MIN, lastActivityAt: T0 + 39 * MIN, signedInAt: null, role: { key: null } })).toBe(
      'ACTIVE',
    );
  });
});
