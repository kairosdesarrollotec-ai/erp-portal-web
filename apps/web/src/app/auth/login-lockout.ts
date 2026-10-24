const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function getStorageKey(identifier: string): string {
  return `kairos_login_failures_${identifier.trim().toLowerCase()}`;
}

export interface LockoutStatus {
  isLocked: boolean;
  remainingMs: number;
  attemptsCount: number;
}

export function checkLoginLockout(identifier: string): LockoutStatus {
  if (!identifier) return { isLocked: false, remainingMs: 0, attemptsCount: 0 };
  try {
    const raw = localStorage.getItem(getStorageKey(identifier));
    if (!raw) return { isLocked: false, remainingMs: 0, attemptsCount: 0 };
    const parsed = JSON.parse(raw) as { failures?: number[] };
    const now = Date.now();
    const recent = (parsed.failures || []).filter((t) => now - t < LOCKOUT_WINDOW_MS);
    if (recent.length >= MAX_FAILED_ATTEMPTS) {
      const oldestInWindow = Math.min(...recent);
      const remaining = LOCKOUT_WINDOW_MS - (now - oldestInWindow);
      return {
        isLocked: remaining > 0,
        remainingMs: Math.max(0, remaining),
        attemptsCount: recent.length,
      };
    }
    return { isLocked: false, remainingMs: 0, attemptsCount: recent.length };
  } catch {
    return { isLocked: false, remainingMs: 0, attemptsCount: 0 };
  }
}

export function recordLoginFailure(identifier: string): boolean {
  if (!identifier) return false;
  try {
    const now = Date.now();
    const key = getStorageKey(identifier);
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as { failures?: number[] }) : { failures: [] };
    const recent = (parsed.failures || []).filter((t) => now - t < LOCKOUT_WINDOW_MS);
    recent.push(now);
    localStorage.setItem(key, JSON.stringify({ failures: recent }));
    return recent.length >= MAX_FAILED_ATTEMPTS;
  } catch {
    return false;
  }
}

export function clearLoginFailures(identifier: string): void {
  if (!identifier) return;
  try {
    localStorage.removeItem(getStorageKey(identifier));
  } catch {
    // ignore
  }
}
