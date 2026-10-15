/** Vigencia de la sesión de trabajo (TDD-00 §8.4). */
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

/** Formatea milisegundos restantes en "Xh Ymin restantes" o "< 1 min restante". */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Sesión expirada';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return '< 1 min restante';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min restantes`;
  if (minutes === 0) return `${hours}h restantes`;
  return `${hours}h ${minutes}min restantes`;
}

/** Tiempo restante de sesión a partir del último inicio de sesión; null si se desconoce. */
export function sessionRemainingLabel(lastSignInTime: string | null | undefined): string | null {
  if (!lastSignInTime) return null;
  const t = new Date(lastSignInTime).getTime();
  if (Number.isNaN(t)) return null;
  return formatRemaining(SESSION_DURATION_MS - (Date.now() - t));
}
