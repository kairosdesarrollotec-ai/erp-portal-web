import { SESSION_DURATION_MS } from './session-time';

/**
 * SEC-F3 - Timeout de sesion. Valores EXACTOS aprobados en TDD-00 8.4 /
 * SDD-00 15.5 (SAD-KAIROS-MVP-001 12.2): absoluta 8 h; inactividad general
 * 30 min; roles privilegiados (Gerencia, Finanzas, RR.HH.) 15 min.
 *
 * Esto es el control de EXPERIENCIA (opcion B del Decision Log: tracker de
 * inactividad en el front + signOut). La revocacion real de tokens vive en
 * Firebase/back (objetivo <=5 min tras baja); el front no es una frontera de
 * seguridad por si solo.
 */
export const IDLE_LIMIT_GENERAL_MS = 30 * 60 * 1000;
export const IDLE_LIMIT_PRIVILEGED_MS = 15 * 60 * 1000;
export const ABSOLUTE_LIMIT_MS = SESSION_DURATION_MS;

/** Roles de sistema privilegiados segun la documentacion: Gerencia, Finanzas y RR.HH. */
export const PRIVILEGED_ROLE_KEYS: readonly string[] = ['GERENCIA', 'FINANZAS', 'RRHH'];

/**
 * Limite de inactividad segun el rol. Si el rol todavia no se conoce (null:
 * aun no cargaron los permisos) se aplica el limite estricto, para no dar a
 * un rol privilegiado la ventana general mientras se resuelve (falla cerrado).
 */
export function idleLimitMs(role: { key: string | null } | null): number {
  if (role === null) return IDLE_LIMIT_PRIVILEGED_MS;
  return role.key !== null && PRIVILEGED_ROLE_KEYS.includes(role.key)
    ? IDLE_LIMIT_PRIVILEGED_MS
    : IDLE_LIMIT_GENERAL_MS;
}

export type SessionStatus = 'ACTIVE' | 'IDLE_EXPIRED' | 'ABSOLUTE_EXPIRED';

export function evaluateSession(input: {
  now: number;
  lastActivityAt: number;
  /** Ultimo inicio de sesion (ms epoch); null si se desconoce. */
  signedInAt: number | null;
  role: { key: string | null } | null;
}): SessionStatus {
  if (input.signedInAt !== null && input.now - input.signedInAt >= ABSOLUTE_LIMIT_MS) return 'ABSOLUTE_EXPIRED';
  if (input.now - input.lastActivityAt >= idleLimitMs(input.role)) return 'IDLE_EXPIRED';
  return 'ACTIVE';
}
